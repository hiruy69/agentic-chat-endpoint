"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

interface ReasoningMessage {
  type: "reasoning"
  content: string
}

interface ToolCallMessage {
  type: "tool_call"
  tool: string
  input: string
  output: string
}

interface ResponseMessage {
  type: "response"
  content: string
}

type SSEMessage = ReasoningMessage | ToolCallMessage | ResponseMessage

export default function Home() {
  const [query, setQuery] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [reasoning, setReasoning] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleSendQuery = async (manual: boolean) => {
    if (!query.trim()) return

    // Clear previous results
    setAiResponse("")
    setReasoning("")
    setToolCalls([])
    setIsStreaming(true)

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const response = await fetch("http://localhost:3003/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query,manual }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setIsStreaming(false)
          break
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.trim() === "") continue

          // Parse SSE format (data: {...})
          const dataMatch = line.match(/^data: (.+)$/)
          if (dataMatch) {
            try {
              const data: SSEMessage = JSON.parse(dataMatch[1])

              switch (data.type) {
                case "reasoning":
                  setReasoning((prev) => prev + data.content + "\n")
                  break
                case "tool_call":
                  setToolCalls((prev) => [...prev, data])
                  break
                case "response":
                  setAiResponse((prev) => prev + data.content)
                  break
              }
            } catch (error) {
              console.error("Error parsing SSE message:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error establishing SSE connection:", error)
      setIsStreaming(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    setAiResponse("")
    setReasoning("")
    setToolCalls([])
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      setIsStreaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-400 p-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">🤖 AI Chat Interface</h1>
          <p className="text-lg text-white/90">Experience streaming AI responses with detailed reasoning</p>
        </div>

        {/* Input Section */}
        <div className="mb-6 rounded-xl bg-gray-200 p-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your question or request here..."
            className="mb-4 h-32 w-full resize-none rounded-lg border-2 border-blue-300 bg-white p-4 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            disabled={isStreaming}
          />

          <div className="flex gap-3">
            <Button
              onClick={() => handleSendQuery(false)}
              disabled={isStreaming || !query.trim()}
              className="bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {isStreaming ? "Streaming..." : "Send Query"}
            </Button>
            <Button
              onClick={() => handleSendQuery(true)}
              disabled={isStreaming || !query.trim()}
              className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Send Query (Manual Agent)
            </Button>
            <Button variant="secondary" onClick={handleClear} className="bg-gray-300 text-gray-700 hover:bg-gray-400">
              Clear
            </Button>
          </div>
        </div>

        {/* Response Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* AI Response */}
          <div className="overflow-hidden rounded-xl bg-gray-200">
            <div className="bg-green-500 p-4">
              <h2 className="text-lg font-semibold text-white">🎯 AI Response</h2>
            </div>
            <div className="h-64 overflow-y-auto p-4">
              <div className="whitespace-pre-wrap text-gray-800">{aiResponse || "Waiting for response..."}</div>
            </div>
          </div>

          {/* Reasoning Process */}
          <div className="overflow-hidden rounded-xl bg-gray-200">
            <div className="bg-orange-400 p-4">
              <h2 className="text-lg font-semibold text-white">🧠 Reasoning Process</h2>
            </div>
            <div className="h-64 overflow-y-auto p-4">
              <div className="whitespace-pre-wrap text-gray-800">{reasoning || "Waiting for reasoning..."}</div>
            </div>
          </div>
        </div>

        {/* Tool Calls Section */}
        <div className="mt-6 overflow-hidden rounded-xl bg-gray-200">
          <div className="bg-purple-600 p-4">
            <h2 className="text-lg font-semibold text-white">🔧 Tool Calls & Results</h2>
          </div>
          <div className="h-48 overflow-y-auto p-4">
            {toolCalls.length === 0 ? (
              <div className="text-gray-600">Waiting for tool calls...</div>
            ) : (
              <div className="space-y-4">
                {toolCalls.map((call, index) => (
                  <div key={index} className="rounded-lg border border-purple-300 bg-white p-3">
                    <div className="mb-2 font-semibold text-purple-700">Tool: {call.tool}</div>
                    <div className="mb-1 text-sm text-gray-600">
                      <span className="font-medium">Input:</span> {call.input}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Output:</span> {call.output}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
