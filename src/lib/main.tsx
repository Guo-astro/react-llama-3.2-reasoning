import { useEffect, useState, useRef, type RefObject } from "react";
import { Progress } from "@/lib/Progress";
import Chat from "./Chat";
import StopIcon from "./icons/StopIcon";
import ArrowRightIcon from "./icons/ArrowRightIcon";
interface MessageData {
  status?: string;
  data?: string;
  file?: string;
  output?: string;
  tps?: number;
  numTokens?: number;
  state?: string;
  progress?: number;
  total?: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  answerIndex?: number;
}

const STICKY_SCROLL_THRESHOLD = 120;
const EXAMPLES = [
  "Solve the equation x^2 - 3x + 2 = 0",
  "Lily is three times older than her son. In 15 years, she will be twice as old as him. How old is she now?",
  "Write python code to compute the nth fibonacci number.",
];

export function LlamaReasoningReactComponent() {
  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Model loading and progress
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [progressItems, setProgressItems] = useState<MessageData[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Inputs and outputs
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);
  const [isWebGPUAvailable, setIsWebGPUAvailable] = useState(false);

  useEffect(() => {
    setIsWebGPUAvailable(!!navigator?.gpu);
  }, []);
  function onEnter(message: string) {
    setMessages((prev) => {
      return [...prev, { role: "user", content: message }];
    });
    setTps(null);
    setIsRunning(true);
    setInput("");
  }

  function onInterrupt() {
    if (worker.current) {
      worker.current.postMessage({ type: "interrupt" });
    }
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  function resizeInput() {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  useEffect(() => {
    // Create the worker if it does not yet exist.
    if (!worker.current) {
      worker.current = new Worker(
        new URL(
          "./worker.js",
          import.meta.url
        ),
        { type: "module" }
      );
      worker.current.postMessage({ type: "check" }); // Do a feature check
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent<MessageData>) => {
      const {
        status: messageStatus,
        data,
        file,
        output,
        tps,
        numTokens,
        state,
        progress,
        total,
      } = e.data;

      switch (messageStatus) {
        case "loading":
          setStatus("loading");
          if (typeof data === "string") setLoadingMessage(data);
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === file) {
                // Cast the new object as MessageData to ensure it matches the interface
                return {
                  ...item,
                  progress,
                  total,
                } as MessageData;
              }
              return item;
            })
          );

          break;

        case "done":
          setProgressItems((prev) => prev.filter((item) => item.file !== file));
          break;

        case "ready":
          setStatus("ready");
          break;

        case "start":
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          break;

        case "update":
          {
            setTps(tps ?? null);
            setNumTokens(numTokens ?? null);
            setMessages((prev) => {
              const cloned = [...prev];
              const last = cloned.at(-1);
              if (last) {
                const newContent = last.content + (output ?? "");
                const updated = { ...last, content: newContent };
                if (
                  updated.answerIndex === undefined &&
                  state === "answering"
                ) {
                  updated.answerIndex = last.content.length;
                }
                cloned[cloned.length - 1] = updated;
              }
              return cloned;
            });
          }
          break;

        case "complete":
          setIsRunning(false);
          break;

        case "error":
          if (typeof data === "string") setError(data);
          break;
      }
    };

    const onErrorReceived = (e: ErrorEvent) => {
      console.error("Worker error:", e);
    };

    if (worker.current) {
      worker.current.addEventListener("message", onMessageReceived);
      worker.current.addEventListener("error", onErrorReceived);
    }

    // Cleanup
    return () => {
      if (worker.current) {
        worker.current.removeEventListener("message", onMessageReceived);
        worker.current.removeEventListener("error", onErrorReceived);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.filter((x) => x.role === "user").length === 0) {
      // No user messages yet
      return;
    }
    if (messages.at(-1)?.role === "assistant") {
      return;
    }
    setTps(null);
    if (worker.current) {
      worker.current.postMessage({ type: "generate", data: messages });
    }
  }, [messages, isRunning]);

  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const element = chatContainerRef.current;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      STICKY_SCROLL_THRESHOLD
    ) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isRunning]);

  return isWebGPUAvailable ? (
    <div className="flex flex-col h-screen mx-auto items justify-end text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">
      {status === null && messages.length === 0 && (
        <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
          <div className="flex flex-col items-center mb-1 max-w-[360px] text-center">
            <h1 className="text-4xl font-bold mb-1">Llama-3.2 Reasoning</h1>
            <h2 className="font-semibold">
              A blazingly fast and powerful reasoning AI chatbot that runs
              locally in your browser.
            </h2>
          </div>

          <div className="flex flex-col items-center px-4">
            <p className="max-w-[480px] mb-4">
              You are about to load{" "}
              <a
                href="https://huggingface.co/ngxson/MiniThinky-v2-1B-Llama-3.2"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                MiniThinky-v2
              </a>
              , a 1.2B parameter reasoning LLM optimized for in-browser
              inference. Everything runs entirely in your browser with{" "}
              <a
                href="https://huggingface.co/docs/transformers.js"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                🤗&nbsp;Transformers.js
              </a>{" "}
              and ONNX Runtime Web, meaning no data is sent to a server. Once
              loaded, it can even be used offline. The source code for the demo
              is available on{" "}
              <a
                href="https://github.com/huggingface/transformers.js-examples/tree/main/llama-3.2-reasoning-webgpu"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                GitHub
              </a>
              .
            </p>

            {error && (
              <div className="text-red-500 text-center mb-2">
                <p className="mb-1">
                  Unable to load model due to the following error:
                </p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              className="border px-4 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 cursor-pointer disabled:cursor-not-allowed select-none"
              onClick={() => {
                if (worker.current) {
                  worker.current.postMessage({ type: "load" });
                  setStatus("loading");
                }
              }}
              disabled={status !== null || error !== null}
            >
              Load model
            </button>
          </div>
        </div>
      )}
      {status === "loading" && (
        <>
          <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
            <p className="text-center mb-1">{loadingMessage}</p>
            {progressItems.map(({ file, progress, total }, i) => (
              <Progress
                key={i}
                text={file ?? ""}
                percentage={progress ?? 0}
                total={total}
              />
            ))}
          </div>
        </>
      )}

      {status === "ready" && (
        <div
          ref={chatContainerRef as RefObject<HTMLDivElement>}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat messages={messages} />
          {messages.length === 0 && (
            <div>
              {EXAMPLES.map((msg, i) => (
                <div
                  key={i}
                  className="m-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-gray-100 dark:bg-gray-700 cursor-pointer"
                  onClick={() => onEnter(msg)}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm min-h-6 text-gray-500 dark:text-gray-300">
            {tps && messages.length > 0 && (
              <>
                {!isRunning && (
                  <span>
                    Generated {numTokens} tokens in{" "}
                    {numTokens && tps ? (numTokens / tps).toFixed(2) : "0"}{" "}
                    seconds&nbsp;(
                  </span>
                )}
                <>
                  <span className="font-medium text-center mr-1 text-black dark:text-white">
                    {tps.toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-300">
                    tokens/second
                  </span>
                </>
                {!isRunning && (
                  <>
                    <span className="mr-1">).</span>
                    <span
                      className="underline cursor-pointer"
                      onClick={() => {
                        if (worker.current) {
                          worker.current.postMessage({ type: "reset" });
                          setMessages([]);
                        }
                      }}
                    >
                      Reset
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-2 border border-gray-300 dark:bg-gray-700 rounded-lg w-[600px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex">
        <textarea
          ref={textareaRef}
          className="scrollbar-thin w-[550px] dark:bg-gray-700 px-3 py-4 rounded-lg bg-transparent border-none outline-hidden text-gray-800 disabled:text-gray-400 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:placeholder-gray-200 resize-none disabled:cursor-not-allowed"
          placeholder="Type your message..."
          rows={1}
          value={input}
          disabled={status !== "ready"}
          title={status === "ready" ? "Model is ready" : "Model not loaded yet"}
          onKeyDown={(e) => {
            if (
              input.length > 0 &&
              !isRunning &&
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              onEnter(input);
            }
          }}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
        {isRunning ? (
          <div className="cursor-pointer" onClick={onInterrupt}>
            <StopIcon className="h-8 w-8 p-1 rounded-md text-gray-800 dark:text-gray-100 absolute right-3 bottom-3" />
          </div>
        ) : input.length > 0 ? (
          <div className="cursor-pointer" onClick={() => onEnter(input)}>
            <ArrowRightIcon
              className={`h-8 w-8 p-1 bg-gray-800 dark:bg-gray-100 text-white dark:text-black rounded-md absolute right-3 bottom-3`}
            />
          </div>
        ) : (
          <div>
            <ArrowRightIcon
              className={`h-8 w-8 p-1 bg-gray-200 dark:bg-gray-600 text-gray-50 dark:text-gray-800 rounded-md absolute right-3 bottom-3`}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mb-3">
        Disclaimer: Generated content may be inaccurate or false.
      </p>
    </div>
  ) : (
    <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">
      WebGPU is not supported by this browser :(
    </div>
  );
}
