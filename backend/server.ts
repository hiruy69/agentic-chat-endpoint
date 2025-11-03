require('dotenv').config()

import express, { Request, Response } from 'express';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { createAgent,tool } from "langchain";
import axios from "axios";
import cors from "cors";
import * as cheerio from "cheerio";
import { GoogleGenAI,FunctionCallingConfigMode, FunctionDeclaration, Type,Behavior, Content } from '@google/genai';

const port = process.env.PORT || 3003;

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// to simply the demo and in prod use better options like builtin Tools like SerpAPI or DuckDuckGoSearch from community tools
const _webSearch = async ({ query }: { query: string }) => {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    let response;
    try {
      response = await axios.get(url, { 
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" }
      });
    } catch (err) {
      throw new Error(`Error fetching ${url}: ${err}`);
    }
    const data = response.data;
    if (typeof data !== "string") {
      throw new Error(`Expected HTML string but got ${typeof data}`);
    }
    const $ = cheerio.load(data);
    const results = $(".result")
      .slice(0, 3)
      .map((i, el) => {
        const title = $(el).find(".result__a").text().trim();
        const snippet = $(el).find(".result__snippet").text().trim();
        const link = $(el).find(".result__a").attr("href");
        return { title, snippet, link };
      })
      .get();
    if (results.length === 0) {
      console.warn(`No results found for query ${query}`);
    }
    
    return results
    .map(r => `${r.title}\n${r.snippet}\n${r.link}`)
    .join("\n\n");
}

// Define the web search tool
const webSearchTool = tool(
  _webSearch
  ,
  {
    name: "web_search",
    description: "Search the web and return top 3 result titles for a query",
    schema: z.object({
      query: z.string().describe("The search query to issue")
    })
  }
);

// const MODEL_NAME = "gemini-1.5-pro";
const MODEL_NAME = "gemini-2.5-flash";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;
const model = new ChatGoogleGenerativeAI({
    model: MODEL_NAME,
    temperature: 0,
    apiKey: GEMINI_API_KEY
});


const now = new Date().toISOString().split("T")[0];

const agent = createAgent({
  model: model,
  tools: [webSearchTool],
  systemPrompt: `The current date is ${now}. Use this as reference.`,
});

// for manual function calling
const browserUseDeclaration: FunctionDeclaration = {
    name: 'browserUse',
    behavior: Behavior.BLOCKING,
    description: "Gets information from the internet using the browser",
    parametersJsonSchema: {
      type: Type.OBJECT,
      properties:{
        input: {
          type: Type.STRING,
        },
      },
      required: ['input'],
    },
  };

const genAI = new GoogleGenAI({apiKey:GEMINI_API_KEY});

const manualAgent = async(history: Content[],include: boolean=true) => {
  const config = {
          model: MODEL_NAME,
          contents: history,
          config: {
            systemInstruction: `You are an AI assistant that helps people find information. and The current date is ${now}. Use this as reference.`,
        }
    };
    if(include){
      config['config']['toolConfig'] = {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.VALIDATED,
          allowedFunctionNames: ['browserUse'],
        }
      };
      config['config']['tools'] = [{functionDeclarations: [browserUseDeclaration]}];
    }
    return await genAI.models.generateContentStream(config);
}

app.post('/chat', async (req: Request, res: Response) => {
  const { query,manual } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Use Server-Sent Events (SSE) format - better for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send headers immediately
  res.flushHeaders();

  // Helper function to send SSE-formatted chunks immediately
  const sendSSE = (data: object) => {
    const jsonData = JSON.stringify(data);
    res.write(`data: ${jsonData}\n\n`);
    console.log(jsonData)
    
    // Force immediate send
    const httpRes = res as any;
    if (httpRes._flush) {
      httpRes._flush();
    }
    if (typeof httpRes.flush === 'function') {
      httpRes.flush();
    }
  };

  if (!manual){
    const stream = await agent.stream(
          {
              messages: [
                  {
                      role: "user",
                      content: query,
                  },
              ],
          },
          { streamMode: "messages" }
          // updates
      );
  
    for await (const [chunk, metadata] of stream) {
        // Extract messages from chunk (chunk keys: "model_request", "tools", etc.)
        chunk.content && (
          chunk.type === "tool" ? sendSSE({
              type: "tool_call",
              tool: chunk.name,
              input: chunk.args,
              output: chunk.content,
          })
          :
          sendSSE({
              type: chunk.type === "reasoning" || chunk.type === "thinking" ? "reasoning" : "response",
              content: chunk.content,
          })
        )
    }
  }else{

    const history: Content[] = [{ role: 'user', parts: [{ text: query }] }];
    const stream = await manualAgent(history);
  
    for await (const chunk of stream) {
      // chunk.candidates?.[0].content.parts?.[0].thought && add reasoning when model supports it but now lets simulate it
      sendSSE({
                type: "reasoning",
                content: chunk.candidates?.[0].content.parts?.[0].thought ?? "Thinking about relevant factors...",
        });
      const functionCall = chunk.candidates?.[0].content.parts?.[0].functionCall
      if(functionCall){
        // It's a function call
        const result = await _webSearch({query: functionCall.args.input as string})
        sendSSE({
              type: "tool_call",
              tool: functionCall.name,
              input: functionCall.args.input,
              output: result,
          })
        // Update history manually: Add the model's request and the app's response
        history.push(chunk.candidates?.[0].content); 
        history.push({
            role: 'function',
            parts: [{
                functionResponse: {
                    name: functionCall.name,
                    response: {result},
                },
            }],
        });
        // Call the agent again with updated history
        const followUpStream = await manualAgent(history, false);
        for await (const followUpChunk of followUpStream) {
          console.log(followUpChunk.candidates?.[0].content?.parts?.[0].text);
            followUpChunk.candidates?.[0].content?.parts?.[0].text && sendSSE({
                type: "response",
                content: followUpChunk.candidates?.[0].content.parts?.[0].text,
            });
        }
      }
    }
  }

  // End the SSE stream
  res.write('event: end\n');
  res.write('data: {}\n\n');
  res.end();


});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});