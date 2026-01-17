
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Gujarat: "#4CAF50",
    Bihar: "#2196F3",
    "All India": "#FF9800",
    Punjab: "#9C27B0",
    Rajasthan: "#E91E63",
    Maharashtra: "#00BCD4",
    Delhi: "#795548",
    Sikar: "#607D8B",
  };
  return colors[category] || "#666";
};

export const getDaysRemaining = (deadline: string | null, isExpired: boolean = false) => {
  if (isExpired) return { text: "Expired", color: "#F44336" };
  if (!deadline) return { text: "Open", color: "#4CAF50" };

  // Handle "No Deadline" string from API map
  if (deadline === "No Deadline" || deadline.startsWith("Deadline: ")) {
    const dateStr = deadline.replace("Deadline: ", "");
    if (dateStr === "No Deadline") return { text: "Open", color: "#4CAF50" };
    // Try parsing if it's a date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { text: deadline, color: "#666" };

    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expired", color: "#F44336" };
    if (diffDays === 0) return { text: "Today", color: "#FF9800" };
    if (diffDays === 1) return { text: "1 day left", color: "#FF9800" };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: "#FF9800" };
    return { text: `${diffDays} days left`, color: "#666" };
  }

  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "Expired", color: "#F44336" };
  if (diffDays === 0) return { text: "Today", color: "#FF9800" };
  if (diffDays === 1) return { text: "1 day left", color: "#FF9800" };
  if (diffDays <= 7)
    return { text: `${diffDays} days left`, color: "#FF9800" };
  return { text: `${diffDays} days left`, color: "#666" };
};
