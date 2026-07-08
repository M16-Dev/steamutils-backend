import config from "@/config.ts";

/**
 * Sends a message to the configured Discord webhook.
 * @param type - Type of message: "info" or "error".
 * @param title - Title of the message.
 * @param message - Message content.
 */
export const sendMessage = async (type: "info" | "error", title: string, message: string) => {
  try {
    await fetch(config.discordWebhookUrl + "?with_components=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
        components: [
          {
            "type": 17,
            "accent_color": type === "info" ? 0x5865F2 : 0xED4245,
            "components": [
              {
                "type": 10,
                "content": `## [backend] ${title}`,
              },
              { "type": 14 },
              {
                "type": 10,
                "content": "```" + message.trim() + "```",
              },
            ],
          },
        ],
        flags: 32768,
      }),
    });
  } catch (_) { /**/ }
};
