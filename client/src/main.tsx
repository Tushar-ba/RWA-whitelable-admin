import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./config/reown"; // Initialize AppKit

createRoot(document.getElementById("root")!).render(<App />);
