import { LlamaReasoningReactComponent } from "@/lib/main";
import Header from "./Header";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-800 transition-colors duration-300">
      <Header />
      <LlamaReasoningReactComponent />
    </div>
  );
}

export default App;
