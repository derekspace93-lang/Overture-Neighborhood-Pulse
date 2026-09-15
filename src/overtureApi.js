// All Overture Maps API calls live in this file.
// Keeping network code separate makes the React components easier for a
// beginner to read: components can focus on the interface and analysis.

const OVERTURE_PLACES_ENDPOINT = "https://api.overturemapsapi.com/places";

// You can create your own key at https://www.overturemapsapi.com/.
// Vite exposes variables beginning with VITE_ to the browser.
const OVERTURE_API_KEY = import.meta.env.VITE_OVERTURE_API_KEY || "";

/**
 * Send a request to the Overture Places API and return the parsed JSON.
 *
 * @param {URLSearchParams} queryParameters - Parameters for the request.
 * @returns {Promise<unknown>} Parsed API response.
 */
async function requestOverturePlaces(queryParameters) {
  if (!OVERTURE_API_KEY) {
    throw new Error(
      "No Overture Maps API key was found. Add VITE_OVERTURE_API_KEY to your .env file."
    );
  }

  const response = await fetch(
    `${OVERTURE_PLACES_ENDPOINT}?${queryParameters.toString()}`,
    {
      headers: {
        "x-api-key": OVERTURE_API_KEY,
      },
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Overture request failed (${response.status}). ${responseText || "Please check your API key and request parameters."}`
    );
  }

  return response.json();
}

/**
 * Find anchor places in a country.
 *
 * The user chooses an anchor category such as hotel, restaurant or museum.
 * These are the places the user can click to trigger the neighborhood analysis.
 */
export async function findAnchorPlaces(countryCode, anchorCategory) {
  const queryParameters = new URLSearchParams({
    country: countryCode,
    categories: anchorCategory,
    limit: "100",
    format: "json",
  });

  return requestOverturePlaces(queryParameters);
}

/**
 * Find several kinds of useful services around one selected place.
 *
 * The API accepts comma-separated categories, so one request can retrieve
 * several service groups at once.
 */
export async function findNearbyServices(
  latitude,
  longitude,
  radiusInMeters,
  serviceCategories
) {
  const queryParameters = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: String(radiusInMeters),
    categories: serviceCategories.join(","),
    limit: "1000",
    format: "json",
  });

  return requestOverturePlaces(queryParameters);
}
