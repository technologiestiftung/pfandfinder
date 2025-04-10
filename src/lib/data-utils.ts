import { promises as fsPromises } from "fs";
import path from "path";

/**
 * Read and parse a JSON file
 */
export async function readJsonFile(filePath: string) {
  try {
    const data = await fsPromises.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Read and parse a GeoJSON file
 * This handles the specific structure of GeoJSON files and formats them for use in the app
 */
export async function readGeoJsonFile(filePath: string) {
  try {
    const data = await fsPromises.readFile(filePath, "utf8");
    const geoJson = JSON.parse(data);

    // Convert GeoJSON features to our standard format for easy processing
    if (geoJson.type === "FeatureCollection" && geoJson.features) {
      return {
        data: geoJson.features.map((feature: any, index: number) => {
          // Extract coordinates from geometry
          const coordinates = feature.geometry?.coordinates || [0, 0];
          const lng = coordinates[0];
          const lat = coordinates[1];

          // For point geometry, return a simple point object
          // Use properties as additional data or fallback to empty object
          return {
            id: feature.id || index + 1,
            lat: lat,
            lng: lng,
            ...feature.properties,
          };
        }),
      };
    }

    // If not a FeatureCollection, return the raw JSON
    return geoJson;
  } catch (error) {
    console.error(`Error reading GeoJSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Read and parse a CSV file
 * This is a simple implementation - for more complex CSV parsing consider using a library
 */
export async function readCsvFile(filePath: string) {
  try {
    const data = await fsPromises.readFile(filePath, "utf8");
    const lines = data.split("\n");
    const headers = lines[0].split(",").map((header) => header.trim());

    return lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(",").map((value) => value.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as Record<string, string>);
      });
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get all available data files in the directory
 */
export async function getDataFiles(directory: string = "public/data") {
  try {
    const files = await fsPromises.readdir(directory);
    return files.map((file) => ({
      name: file,
      path: path.join(directory, file),
      type: path.extname(file).toLowerCase(),
    }));
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

/**
 * Read data from a file based on its extension
 */
export async function readDataFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".json":
      return await readJsonFile(filePath);
    case ".geojson":
      return await readGeoJsonFile(filePath);
    case ".csv":
      return await readCsvFile(filePath);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

/**
 * Read all data files from the directory
 */
export async function readAllDataFiles(directory: string = "public/data") {
  const files = await getDataFiles(directory);
  const data: Record<string, any> = {};

  for (const file of files) {
    try {
      const fileData = await readDataFile(file.path);
      // Use filename without extension as the key
      const key = path.basename(file.name, path.extname(file.name));
      data[key] = fileData;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }

  return data;
}
