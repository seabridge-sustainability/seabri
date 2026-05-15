import { spawnSync } from "node:child_process";

const SENTINEL = "C:/Users/adelm/SeaBridgeAI/everything-claude-code/scripts/sentinel_preflight_gate.py";

function runSentinel(tool, args) {
  const payload = JSON.stringify({
    tool_name: tool,
    tool_input: args || {},
  });
  const result = spawnSync("python3", [SENTINEL], {
    input: payload,
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
  });

  if (result.error) return { decision: "allow" };

  try {
    return JSON.parse(result.stdout || "{}");
  } catch {
    return { decision: "allow" };
  }
}

export const SeaBridgeSentinelPlugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const response = runSentinel(input.tool, output.args);
      if (response.decision === "block" || response.decision === "deny") {
        throw new Error(response.reason || "MCP Sentinel blocked this tool call.");
      }
    },
    "command.execute.before": async (input) => {
      const response = runSentinel("command.execute", {
        command: input.command,
        arguments: input.arguments,
      });
      if (response.decision === "block" || response.decision === "deny") {
        throw new Error(response.reason || "MCP Sentinel blocked this command.");
      }
    },
  };
};

export default SeaBridgeSentinelPlugin;

