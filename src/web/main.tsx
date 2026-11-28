import { createRoot } from "react-dom/client";
import { App } from "./app";
import { installEasing } from "./easing";
import "./smooth-scroll.css";

installEasing();
createRoot(document.getElementById("root")!).render(<App />);
