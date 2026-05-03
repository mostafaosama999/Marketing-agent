import {clearPause} from "../costGate";
import {SlashResponse} from "../slack/slashHandler";

export async function handleResume(): Promise<SlashResponse> {
  await clearPause();
  return {
    response_type: "ephemeral",
    text: "▶️ Resumed. Paused state cleared. Next morning batch will run normally.",
  };
}
