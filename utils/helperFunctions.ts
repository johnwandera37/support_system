// The following gets the id for PATCH, PUT or DELETE APIs
export async function getIdFromParams(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return id;
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Priority color
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    case "LOW":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};

// Status color util
export const getStatusColor = (status: string) => {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-800";
    case "ASSIGNED":
      return "bg-purple-100 text-purple-800";
    case "RESOLVED":
      return "bg-green-100 text-green-800";
    case "ESCALATED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
