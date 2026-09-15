# Overture Neighborhood Pulse

Overture Neighborhood Pulse is a small React application that uses the Overture Places API to explore what is located around a selected place.

Instead of only showing a list of locations, the app looks at the mix of services around an anchor place and turns the results into a few simple geographic insights.

## What it does

1. Choose a country.
2. Choose an anchor type such as a hotel, restaurant, hospital, museum, university, or shopping center.
3. Search Overture for matching places.
4. Select one of the returned places.
5. Choose an analysis radius.
6. The app searches for nearby restaurants, grocery stores, pharmacies, hospitals, parks, and banks.
7. The results are summarized as service coverage, proximity, service mix, and a Neighborhood Pulse score.

The radius is measured from the selected anchor place, using its latitude and longitude as the center of the search.

## Overture Maps API

The project uses the Overture Places endpoint:

```text
https://api.overturemapsapi.com/places
```

There are two main requests in the app.

### Find anchor places

The first request uses the selected country and category:

```text
/places?country=NG&categories=hotel&limit=100&format=json
```

The actual country code and category depend on the selections made in the app.

### Find nearby services

After an anchor is selected, its coordinates are used as the center of a radius search:

```text
/places?lat=6.4281&lng=3.4219&radius=1500&categories=restaurant,grocery_store,pharmacy,hospital,park,bank&limit=1000&format=json
```

The coordinates and radius in this example are only illustrative.

The app reads the current Overture taxonomy information from `taxonomy.primary`, with `basic_category` as a fallback.

## Neighborhood Pulse

The score is intended as a simple way to summarize the results. It combines two measurements:

- **Service coverage (60%)** — how many of the selected service categories are represented.
- **Proximity (40%)** — how close the nearest example of each represented service category is.

The score is calculated in `src/analysis.js`. The calculations are kept separate from the React components so they are easier to read and change.

## Project structure

```text
src/
├── App.jsx
├── analysis.js
├── index.css
├── main.jsx
├── overtureApi.js
└── sections/
    └── countries.json
```

### Main files

- `App.jsx` — page layout, controls, loading states, and results.
- `overtureApi.js` — requests sent to the Overture Places API.
- `analysis.js` — distance calculations and neighborhood analysis.
- `index.css` — application styling.
- `countries.json` — country names and codes used by the country selector.

## Getting started

### Requirements

- Node.js 18 or newer
- An Overture Maps API key

### Install

```bash
npm install
```

### Add your API key

Create a `.env` file in the project root:

```env
VITE_OVERTURE_API_KEY=YOUR_OVERTURE_API_KEY_HERE
```

Do not commit your real API key to a public repository.

### Run the app

```bash
npm run dev
```

Vite will print the local address in the terminal.

### Build for production

```bash
npm run build
```

## How the analysis works

The app uses the selected place as the geographic origin. Overture returns the places inside the requested radius, and the application then groups those records by primary category.

For distance calculations, `analysis.js` uses the Haversine formula. This gives a straight-line geographic distance between two latitude/longitude points. It is not a walking or driving distance.

The service mix is shown in the interface so the user can see which categories make up the surrounding area. The app also shows the closest returned place and allows individual records to be inspected.

## Notes

The quality and completeness of the results depend on the Overture Places data available for the selected area. A place may also have incomplete address or category information.

The application is intentionally focused on a small set of service categories. Those categories can be changed in `src/App.jsx` if a different type of neighborhood analysis is needed.

## References

- Overture Maps Places documentation: https://docs.overturemaps.org/guides/places/
- Overture Places schema: https://docs.overturemaps.org/schema/reference/places/place/
- Overture taxonomy documentation: https://docs.overturemaps.org/schema/reference/places/types/taxonomy/

## License

This project is provided for demonstration and challenge purposes.
