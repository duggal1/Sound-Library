import { createRoot } from "react-dom/client";
import { App } from "./app";
import { installEasing } from "./easing";

installEasing();
createRoot(document.getElementById("root")!).render(<App />);
