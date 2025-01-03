"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, LoaderPinwheel } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Chatbot = ({ insights, isInsightsGenerated }) => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "What can I help you with?" },
  ]);

  const [conversationHistory, setConversationHistory] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const suggestions = [
    "Can you suggest policies based on the current situation?",
    "How does engine load affect fuel usage?",
    "Which routes are most used?",
  ];

  const getRelevantResponse = async (userPrompt) => {
    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userPrompt, conversationHistory }),
      });
      const data = await response.json();
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: data.response },
      ]);
      setConversationHistory((prevHistory) => [
        ...prevHistory,
        { sender: "user", text: userPrompt },
        { sender: "bot", text: data.response },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // useEffect(() => {
  //   getRelevantResponse();
  // }, [messages]);

  const sendMessage = async (text) => {
    if (text) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text },
      ]);
      setIsLoading(true); // Set loading state to true
      if (text === "Can you suggest policies based on the current situation?") {
        await getPolicies(insights, isInsightsGenerated);
      } else {
        await getRelevantResponse(text);
      }

      setIsLoading(false); // Set loading state to false
    } else if (inputRef.current) {
      const userMessage = inputRef.current.value;
      if (userMessage.trim() !== "") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "user", text: userMessage },
        ]);
        inputRef.current.value = ""; // Clear the input field
        setIsLoading(true); // Set loading state to true
        await getRelevantResponse(userMessage);
        setIsLoading(false); // Set loading state to false
      }
    }
  };

  const getPolicies = async (insights, isInsightsGenerated) => {
    try {
      if (!isInsightsGenerated) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: "Please generate the main insights first." },
        ]);
        setConversationHistory((prevHistory) => [
          ...prevHistory,
          {
            sender: "user",
            text: "Can you suggest policies based on the current situation?",
          },
          { sender: "bot", text: "Please generate the main insights first." },
        ]);
      } else {
        const response = await fetch("http://localhost:3001/policy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ insightData: insights }),
        });
        const data = await response.json();

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: data.response },
        ]);
        setConversationHistory((prevHistory) => [
          ...prevHistory,
          {
            sender: "user",
            text: "Can you suggest policies based on the current situation?",
          },
          { sender: "bot", text: data.response },
        ]);
      }
    } catch (error) {
      console.error("Error fetching policy recommendations:", error);
    }
  };

  const inputRef = useRef(null);

  return (
    <div className="w-full md:w-1/3 h-1/2 md:h-full p-4 bg-gradient-to-br from-white to-transparent border-l">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex flex-row items-center gap-2">
            <Bot color="teal" />
            Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow relative">
          <ScrollArea className="absolute overflow-y-auto h-[1030px] mb-4 pr-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-2 ${
                  message.sender === "bot" ? "text-left" : "text-right"
                }`}
              >
                <span
                  className={`inline-block p-2 rounded-lg ${
                    message.sender === "bot"
                      ? "bg-teal-700 text-primary-foreground"
                      : "bg-teal-900/5 text-secondary-foreground"
                  }`}
                >
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {message.text}
                  </Markdown>
                </span>
              </div>
            ))}
          </ScrollArea>
          {isLoading && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
              <LoaderPinwheel className="animate-spin" size={48} color="teal" />
              <span className="ml-2 text-teal-700 bg-white/40 px-1 rounded-lg">
                Generating response...
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col">
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  className={`${
                    index === 0
                      ? "text-white bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 hover:text-white"
                      : "bg-teal-500/5 outline-slate-100 hover:bg-teal-500/20"
                  }`}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type your query..."
                className="flex-grow"
              />
              <Button
                className="bg-gradient-to-r from-teal-700 to-cyan-800 hover:from-teal-800 hover:to-cyan-900 w-1/5"
                onClick={() => sendMessage(inputRef.current.value)}
              >
                <Send />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chatbot;
