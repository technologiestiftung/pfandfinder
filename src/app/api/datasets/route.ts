import { NextResponse } from "next/server";
import { getDataFiles } from "@/lib/data-utils";

export async function GET() {
  try {
    // Get all data files from the public/data directory
    const files = await getDataFiles();
    
    // Format the files into dataset objects
    const datasets = files.map(file => {
      const name = file.name.split('.')[0]; // Remove file extension
      const id = name.toLowerCase();
      
      // Determine icon and color based on name or pattern matching
      let icon = "File";
      let color = "bg-gray-500";
      
      if (id.includes("trash") || id.includes("abfall") || id.includes("müll")) {
        icon = "Trash2";
        color = "bg-red-500";
      } else if (id.includes("event") || id.includes("veranstaltung")) {
        icon = "Calendar";
        color = "bg-blue-500";
      } else if (id.includes("park") || id.includes("green") || id.includes("grün")) {
        icon = "Trees";
        color = "bg-green-500";
      } else if (id.includes("people") || id.includes("person") || id.includes("density") || id.includes("dichte")) {
        icon = "Users";
        color = "bg-amber-500";
      }
      
      return {
        id,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        icon,
        color,
        path: file.path,
        type: file.type
      };
    });
    
    return NextResponse.json({ datasets });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch datasets",
        // Provide fallback datasets in case of error
        datasets: [
          { id: "trashcans", name: "Trash Cans", icon: "Trash2", color: "bg-red-500" },
          { id: "events", name: "Events", icon: "Calendar", color: "bg-blue-500" },
          { id: "people", name: "People Density", icon: "Users", color: "bg-amber-500" }
        ]
      }, 
      { status: 500 }
    );
  }
}