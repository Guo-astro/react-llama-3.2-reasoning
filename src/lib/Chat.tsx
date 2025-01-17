import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { MathJaxContext, MathJax } from "the-react-mathjax";
import "./Chat.css";
import { BotIcon } from "./icons/BotIcon";
import { BrainIcon } from "./icons/BrainIcon";
import { UserIcon } from "./icons/UserIcon";

interface MessageProps {
  role: "assistant" | "user";
  content: string;
  answerIndex?: number;
}

interface ChatProps {
  messages: MessageProps[];
}

// Utility to sanitize and render Markdown to HTML
function renderMarkdownToHtml(text: string): string {
  const sanitizedText = text.replace(/\\([[\](){}])/g, "\\\\$1");
  return DOMPurify.sanitize(
    marked.parse(sanitizedText, {
      async: false,
      breaks: true,
    })
  );
}

// Utility to copy text to clipboard
function copyToClipboard(text: string): void {
  navigator.clipboard
    .writeText(text)
    .catch((err) => console.error("Failed to copy: ", err));
}

function AssistantMessage({ content, answerIndex }: MessageProps): JSX.Element {
  const thinking = answerIndex ? content.slice(0, answerIndex) : content;
  const answer = answerIndex ? content.slice(answerIndex) : "";

  const [showThinking, setShowThinking] = useState<boolean>(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState<boolean>(false);

  const doneThinking = answer.length > 0;

  return (
    <div className="flex items-start space-x-4">
      <BotIcon className="h-6 w-6 my-3 text-gray-500 dark:text-gray-300" />
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 w-full">
        <div className="min-h-6 text-gray-800 dark:text-gray-200 overflow-wrap-anywhere space-y-2">
          {doneThinking && (
            <div className="flex justify-end space-x-2">
              <button
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => copyToClipboard(answer)}
              >
                Copy Answer
              </button>
              <button
                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => setShowRawMarkdown((prev) => !prev)}
              >
                {showRawMarkdown ? "View Rendered" : "View Markdown"}
              </button>
            </div>
          )}

          {thinking.length > 0 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg flex flex-col">
                <button
                  className="flex items-center gap-2 cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg"
                  onClick={() => setShowThinking((prev) => !prev)}
                  style={{ width: showThinking ? "100%" : "auto" }}
                >
                  <BrainIcon className={doneThinking ? "" : "animate-pulse"} />
                  <span>
                    {doneThinking ? "View reasoning." : "Thinking..."}
                  </span>
                  <span className="ml-auto text-gray-700 dark:text-gray-300">
                    {showThinking ? "▲" : "▼"}
                  </span>
                </button>
                {showThinking && (
                  <MathJax
                    className="border-t border-gray-200 dark:border-gray-700 px-4 py-2"
                    dynamic
                  >
                    <span
                      className="markdown"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownToHtml(thinking),
                      }}
                    />
                  </MathJax>
                )}
              </div>

              {doneThinking && (
                <div className="mt-2">
                  {showRawMarkdown ? (
                    // Updated <pre> styling for dark and light mode
                    <pre
                      className="p-4 rounded overflow-auto
                                    bg-gray-100 text-gray-800 
                                    dark:bg-gray-800 dark:text-gray-100"
                    >
                      {answer}
                    </pre>
                  ) : (
                    <MathJax dynamic>
                      <div className="p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded">
                        <span
                          className="markdown"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdownToHtml(answer),
                          }}
                        />
                      </div>
                    </MathJax>
                  )}
                </div>
              )}
            </>
          ) : (
            <span className="h-6 flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse"></span>
              <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse animation-delay-200"></span>
              <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse animation-delay-400"></span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ content }: MessageProps): JSX.Element {
  return (
    <div className="flex items-start space-x-4">
      <UserIcon className="h-6 w-6 my-3 text-gray-500 dark:text-gray-300" />
      <div className="bg-blue-500 text-white rounded-lg p-4">
        <p className="min-h-6 overflow-wrap-anywhere">{content}</p>
      </div>
    </div>
  );
}

export function Chat({ messages }: ChatProps): JSX.Element {
  const isEmpty = messages.length === 0;

  return (
    <div
      className={`flex-1 p-6 max-w-[960px] w-full ${
        isEmpty ? "flex flex-col items-center justify-end" : "space-y-4"
      }`}
    >
      <MathJaxContext>
        {isEmpty ? (
          <div className="text-xl">Ready!</div>
        ) : (
          messages.map((msg, index) =>
            msg.role === "assistant" ? (
              <AssistantMessage key={index} {...msg} />
            ) : (
              <UserMessage key={index} {...msg} />
            )
          )
        )}
      </MathJaxContext>
    </div>
  );
}
