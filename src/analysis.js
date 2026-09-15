// Pure analysis functions live here.
// They do not call the API or change React state, which makes the logic easy
// to understand, test and reuse.

/**
 * Return all places from the different response shapes the API may provide.
 */
export function getPlacesFromApiResponse(apiResponse) {
  if (Array.isArray(apiResponse)) return apiResponse;
  if (Array.isArray(apiResponse?.places)) return apiResponse.places;
  if (Array.isArray(apiResponse?.features)) return apiResponse.features;
  if (Array.isArray(apiResponse?.data)) return apiResponse.data;
  return [];
}

/**
 * Get a place's longitude and latitude.
 * Overture Place responses normally expose Point geometry as [longitude, latitude].
 */
export function getPlaceCoordinates(place) {
  const coordinates = place?.geometry?.coordinates;

  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  ) {
    return {
      longitude: Number(coordinates[0]),
      latitude: Number(coordinates[1]),
    };
  }

  return null;
}

/**
 * Overture's current taxonomy.primary is the most specific place category.
 * basic_category is used as a useful fallback when primary is unavailable.
 */
export function getPlacePrimaryCategory(place) {
  return (
    place?.properties?.taxonomy?.primary ||
    place?.taxonomy?.primary ||
    place?.properties?.basic_category ||
    place?.basic_category ||
    "uncategorized"
  );
}

/** Get the primary display name from an Overture place. */
export function getPlaceName(place) {
  return (
    place?.properties?.names?.primary ||
    place?.names?.primary ||
    place?.properties?.name ||
    place?.name ||
    "Unnamed place"
  );
}

/** Get the first address object, if one exists. */
export function getPlaceAddress(place) {
  return place?.properties?.addresses?.[0] || place?.addresses?.[0] || {};
}

/**
 * Calculate straight-line distance using the Haversine formula.
 * This is a geographic distance, not driving or walking distance.
 */
export function calculateDistanceInMeters(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const earthRadiusInMeters = 6371000;
  const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

  const latitudeDifference = degreesToRadians(secondLatitude - firstLatitude);
  const longitudeDifference = degreesToRadians(secondLongitude - firstLongitude);

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(degreesToRadians(firstLatitude)) *
      Math.cos(degreesToRadians(secondLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusInMeters * centralAngle;
}

/**
 * Convert an API category such as grocery_store into a friendly label.
 */
export function formatCategoryName(category) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Build all the decision-support metrics shown in the dashboard.
 *
 * The score is intentionally transparent. It measures how many of the
 * configured service groups are represented, how diverse the nearby mix is,
 * and how close the closest service is.
 */
export function buildNeighborhoodInsights(
  selectedPlace,
  nearbyPlaces,
  expectedServiceCategories,
  radiusInMeters
) {
  const selectedCoordinates = getPlaceCoordinates(selectedPlace);

  if (!selectedCoordinates) {
    return {
      totalNearbyPlaces: 0,
      representedServiceTypes: 0,
      serviceCoveragePercentage: 0,
      averageNearestServiceDistance: null,
      neighborhoodPulseScore: 0,
      categoryBreakdown: [],
      nearbyPlaces: [],
      topCategory: null,
      closestPlace: null,
    };
  }

  // Calculate the distance to every returned service and keep only results
  // that really fall inside the requested radius. This is a second validation
  // layer in addition to the API's radius filter.
  const nearbyPlacesWithDistance = nearbyPlaces
    .map((place) => {
      const coordinates = getPlaceCoordinates(place);
      if (!coordinates) return null;

      return {
        place,
        distanceInMeters: calculateDistanceInMeters(
          selectedCoordinates.latitude,
          selectedCoordinates.longitude,
          coordinates.latitude,
          coordinates.longitude
        ),
        category: getPlacePrimaryCategory(place),
        name: getPlaceName(place),
      };
    })
    .filter(
      (place) =>
        place && place.distanceInMeters <= Number(radiusInMeters)
    )
    .sort((firstPlace, secondPlace) =>
      firstPlace.distanceInMeters - secondPlace.distanceInMeters
    );

  const categoryCounts = new Map();

  nearbyPlacesWithDistance.forEach((nearbyPlace) => {
    const category = nearbyPlace.category;
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });

  const categoryBreakdown = expectedServiceCategories
    .map((category) => ({
      category,
      label: formatCategoryName(category),
      count: categoryCounts.get(category) || 0,
    }))
    .sort((firstCategory, secondCategory) => secondCategory.count - firstCategory.count);

  const representedServiceTypes = categoryBreakdown.filter(
    (category) => category.count > 0
  ).length;

  const serviceCoveragePercentage = Math.round(
    (representedServiceTypes / expectedServiceCategories.length) * 100
  );

  const averageNearestServiceDistance =
    categoryBreakdown
      .filter((category) => category.count > 0)
      .map((category) => {
        const nearest = nearbyPlacesWithDistance.find(
          (place) => place.category === category.category
        );
        return nearest?.distanceInMeters;
      })
      .filter(Number.isFinite).length > 0
      ? categoryBreakdown
          .filter((category) => category.count > 0)
          .map((category) => {
            const nearest = nearbyPlacesWithDistance.find(
              (place) => place.category === category.category
            );
            return nearest?.distanceInMeters;
          })
          .filter(Number.isFinite)
          .reduce((sum, distance) => sum + distance, 0) /
        representedServiceTypes
      : null;

  // The pulse score is deliberately explainable:
  // 60% = service coverage, 40% = proximity to the nearest service of each type.
  const proximityScore =
    averageNearestServiceDistance === null
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            100 * (1 - averageNearestServiceDistance / radiusInMeters)
          )
        );

  const neighborhoodPulseScore = Math.round(
    serviceCoveragePercentage * 0.6 + proximityScore * 0.4
  );

  const topCategory = categoryBreakdown.find((category) => category.count > 0) || null;
  const closestPlace = nearbyPlacesWithDistance[0] || null;

  return {
    totalNearbyPlaces: nearbyPlacesWithDistance.length,
    representedServiceTypes,
    serviceCoveragePercentage,
    averageNearestServiceDistance,
    neighborhoodPulseScore,
    categoryBreakdown,
    nearbyPlaces: nearbyPlacesWithDistance,
    topCategory,
    closestPlace,
  };
}
