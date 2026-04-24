export function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getLastMessage(chat) {
  return chat?.messages?.[chat.messages.length - 1] ?? null;
}
