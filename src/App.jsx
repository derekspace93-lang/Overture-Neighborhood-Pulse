import { useMemo, useState } from "react";
import countries from "./sections/countries.json";
import {
  findAnchorPlaces,
  findNearbyServices,
} from "./overtureApi";
import {
  buildNeighborhoodInsights,
  getPlaceAddress,
  getPlaceCoordinates,
  getPlaceName,
  getPlacePrimaryCategory,
} from "./analysis";
import "./index.css";

// These are the anchor categories a user can explore.
// They are intentionally different from TrainerIQ's original dog-trainer focus.
const ANCHOR_PLACE_OPTIONS = [
  { value: "hotel", label: "Hotels", description: "Find a hotel and inspect its surrounding area." },
  { value: "restaurant", label: "Restaurants", description: "See how well a dining location is served nearby." },
  { value: "museum", label: "Museums", description: "Understand the everyday services around a cultural destination." },
  { value: "hospital", label: "Hospitals", description: "Explore nearby services around a healthcare anchor." },
  { value: "university", label: "Universities", description: "Compare the service ecosystem around a campus." },
  { value: "shopping_center", label: "Shopping Centers", description: "Measure the convenience mix around a retail destination." },
];

// These categories become the dimensions of the neighborhood analysis.
const NEIGHBORHOOD_SERVICE_CATEGORIES = [
  "restaurant",
  "grocery_store",
  "pharmacy",
  "hospital",
  "park",
  "bank",
];

const DEFAULT_RADIUS_IN_METERS = 1500;

function App() {
  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [selectedAnchorCategory, setSelectedAnchorCategory] = useState("hotel");
  const [searchRadiusInMeters, setSearchRadiusInMeters] = useState(DEFAULT_RADIUS_IN_METERS);
  const [anchorPlaces, setAnchorPlaces] = useState([]);
  const [selectedAnchorPlace, setSelectedAnchorPlace] = useState(null);
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState(null);
  const [neighborhoodInsights, setNeighborhoodInsights] = useState(null);
  const [isSearchingAnchors, setIsSearchingAnchors] = useState(false);
  const [isAnalyzingNeighborhood, setIsAnalyzingNeighborhood] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedAnchorOption = useMemo(
    () => ANCHOR_PLACE_OPTIONS.find((option) => option.value === selectedAnchorCategory),
    [selectedAnchorCategory]
  );

  const selectedCountry = useMemo(
    () => countries.find((country) => country.alpha_2 === selectedCountryCode),
    [selectedCountryCode]
  );

  async function handleSearchForPlaces(event) {
    event.preventDefault();
    setErrorMessage("");
    setNeighborhoodInsights(null);
    setSelectedAnchorPlace(null);
    setSelectedNearbyPlace(null);
    setIsSearchingAnchors(true);

    try {
      const response = await findAnchorPlaces(selectedCountryCode, selectedAnchorCategory);
      setAnchorPlaces(Array.isArray(response) ? response : response?.places || []);
    } catch (error) {
      setAnchorPlaces([]);
      setErrorMessage(error.message);
    } finally {
      setIsSearchingAnchors(false);
    }
  }

  async function handleAnchorPlaceClick(place, radiusOverride = searchRadiusInMeters) {
    const coordinates = getPlaceCoordinates(place);

    if (!coordinates) {
      setErrorMessage("This place does not contain usable coordinates, so it cannot be analyzed.");
      return;
    }

    setSelectedAnchorPlace(place);
    setSelectedNearbyPlace(null);
    setNeighborhoodInsights(null);
    setErrorMessage("");
    setIsAnalyzingNeighborhood(true);

    try {
      const response = await findNearbyServices(
        coordinates.latitude,
        coordinates.longitude,
        radiusOverride,
        NEIGHBORHOOD_SERVICE_CATEGORIES
      );

      const nearbyPlaces = Array.isArray(response)
        ? response
        : response?.places || response?.features || [];

      const insights = buildNeighborhoodInsights(
        place,
        nearbyPlaces,
        NEIGHBORHOOD_SERVICE_CATEGORIES,
        radiusOverride
      );

      setNeighborhoodInsights(insights);
      document.getElementById("insights")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsAnalyzingNeighborhood(false);
    }
  }

  function handleRadiusChange(event) {
    const newRadiusInMeters = Number(event.target.value);
    setSearchRadiusInMeters(newRadiusInMeters);

    // If an anchor is already selected, immediately rerun its analysis so the
    // visual radius and the insight numbers always describe the same area.
    if (selectedAnchorPlace) {
      handleAnchorPlaceClick(selectedAnchorPlace, newRadiusInMeters);
    }
  }

  function formatDistance(distanceInMeters) {
    if (!Number.isFinite(distanceInMeters)) return "—";
    if (distanceInMeters < 1000) return `${Math.round(distanceInMeters)} m`;
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Overture Neighborhood Pulse home">
          <span className="brand-mark">OP</span>
          <span>
            <strong>Overture</strong>
            <small>Neighborhood Pulse</small>
          </span>
        </a>
        <nav className="site-nav">
          <a href="#explore">Explore</a>
          <a href="#insights">Insights</a>
          <a href="#method">Method</a>
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">OVERTURE INSIGHT CHALLENGE</p>
          <h1>See what a place says about the neighborhood around it.</h1>
          <p className="hero-description">
            Pick a real-world destination, then turn Overture Places data into a practical
            snapshot of nearby food, health, retail and everyday services.
          </p>
          <div className="hero-stat-row">
            <div><strong>01</strong><span>Choose an anchor</span></div>
            <div><strong>02</strong><span>Measure its surroundings</span></div>
            <div><strong>03</strong><span>Make a better decision</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-building">
            <span className="building-sign">PLACE</span>
            <div className="building-windows">{Array.from({ length: 12 }).map((_, index) => <i key={index} />)}</div>
          </div>
          <div className="floating-pin">⌖</div>
          <div className="floating-card card-one"><strong>6</strong><span>service dimensions</span></div>
          <div className="floating-card card-two"><strong>1.5 km</strong><span>analysis radius</span></div>
        </div>
      </section>

      <section className="explorer-section" id="explore">
        <div className="section-heading">
          <div>
            <p className="eyebrow">START AN EXPLORATION</p>
            <h2>Choose your place of interest</h2>
          </div>
          <p>Every click becomes a new geographic question.</p>
        </div>

        <form className="explorer-controls" onSubmit={handleSearchForPlaces}>
          <label>
            Country
            <select value={selectedCountryCode} onChange={(event) => setSelectedCountryCode(event.target.value)}>
              {countries.map((country) => (
                <option key={country.alpha_2} value={country.alpha_2}>{country.name}</option>
              ))}
            </select>
          </label>
          <label>
            Anchor place
            <select value={selectedAnchorCategory} onChange={(event) => setSelectedAnchorCategory(event.target.value)}>
              {ANCHOR_PLACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="radius-control">
            <span>Analysis radius</span>
            <select value={searchRadiusInMeters} onChange={handleRadiusChange}>
              <option value="500">500 m</option>
              <option value="1000">1 km</option>
              <option value="1500">1.5 km</option>
              <option value="2500">2.5 km</option>
              <option value="5000">5 km</option>
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={isSearchingAnchors}>
            {isSearchingAnchors ? "Searching…" : "Find places"}
          </button>
        </form>

        <div className="selection-note">
          <span className="selection-dot" />
          {selectedAnchorOption?.description} Country: <strong>{selectedCountry?.name}</strong>.
          <span className="radius-note">The radius starts at the anchor you select below.</span>
        </div>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        <div className="place-browser">
          <div className="place-list-panel">
            <div className="panel-heading">
              <div><span>Results</span><strong>{anchorPlaces.length}</strong></div>
              <small>Click a place to analyze it</small>
            </div>
            {anchorPlaces.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">◌</span>
                <h3>Your geographic canvas is empty.</h3>
                <p>Choose a country and anchor category above to begin.</p>
              </div>
            ) : (
              <div className="place-list">
                {anchorPlaces.map((place, index) => (
                  <button
                    key={place.id || `${getPlaceName(place)}-${index}`}
                    className={`place-row ${selectedAnchorPlace?.id === place.id ? "active" : ""}`}
                    onClick={() => handleAnchorPlaceClick(place)}
                  >
                    <span className="place-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="place-row-copy">
                      <strong>{getPlaceName(place)}</strong>
                      <small>{getPlaceAddress(place).locality || getPlaceAddress(place).freeform || "Address unavailable"}</small>
                    </span>
                    <span className="place-category">{getPlacePrimaryCategory(place).replaceAll("_", " ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="analysis-preview">
            {selectedAnchorPlace ? (
              <div className="selected-place-card">
                <p className="eyebrow">SELECTED ANCHOR</p>
                <h3>{getPlaceName(selectedAnchorPlace)}</h3>
                <p>{getPlaceAddress(selectedAnchorPlace).freeform || getPlaceAddress(selectedAnchorPlace).locality || "Location details unavailable"}</p>
                <div className="anchor-meta">
                  <span>{getPlacePrimaryCategory(selectedAnchorPlace).replaceAll("_", " ")}</span>
                  <span>{searchRadiusInMeters.toLocaleString()} m radius</span>
                </div>

                <div className="radius-visual" aria-label={`Analysis radius of ${searchRadiusInMeters.toLocaleString()} metres centered on ${getPlaceName(selectedAnchorPlace)}`}>
                  <div className="radius-visual-label">
                    <strong>{searchRadiusInMeters.toLocaleString()} m</strong>
                    <span>from this place</span>
                  </div>
                  <div className="radius-orbit radius-orbit-outer" />
                  <div className="radius-orbit radius-orbit-middle" />
                  <div className="radius-origin">
                    <span className="radius-pin">⌖</span>
                    <span>YOU START HERE</span>
                  </div>
                  <div className="radius-edge-label">analysis boundary</div>
                </div>

                <div className="radius-explanation">
                  <span className="radius-explanation-icon">↔</span>
                  <p><strong>What does the radius mean?</strong> Every nearby service is measured outward from this selected anchor. Change the radius above to expand or tighten the analysis area.</p>
                </div>

                {isAnalyzingNeighborhood && <div className="loading-line"><span />Analyzing nearby services…</div>}
                {!isAnalyzingNeighborhood && neighborhoodInsights && (
                  <button className="text-button" onClick={() => document.getElementById("insights")?.scrollIntoView({ behavior: "smooth" })}>
                    View neighborhood pulse →
                  </button>
                )}
              </div>
            ) : (
              <div className="analysis-preview-empty">
                <span>01</span>
                <h3>Select a result.</h3>
                <p>We will use its coordinates as the center of a new Overture-powered neighborhood analysis.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="insights-section" id="insights">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GEOGRAPHIC INSIGHT</p>
            <h2>Neighborhood Pulse</h2>
          </div>
          <p>Raw place records transformed into signals you can compare.</p>
        </div>

        {!neighborhoodInsights ? (
          <div className="insights-empty">
            <div className="pulse-ring">◎</div>
            <h3>No neighborhood selected yet.</h3>
            <p>Click any result above and this space will become a decision dashboard.</p>
          </div>
        ) : (
          <>
            <div className="insight-hero-card">
              <div>
                <p className="eyebrow">{getPlaceName(selectedAnchorPlace)}</p>
                <h3>How complete is the surrounding service ecosystem?</h3>
                <p>
                  Within {searchRadiusInMeters.toLocaleString()} metres, Overture returned {neighborhoodInsights.totalNearbyPlaces} places across {neighborhoodInsights.representedServiceTypes} of {NEIGHBORHOOD_SERVICE_CATEGORIES.length} service dimensions.
                </p>
              </div>
              <div className="score-circle" style={{ "--score": `${neighborhoodInsights.neighborhoodPulseScore * 3.6}deg` }}>
                <strong>{neighborhoodInsights.neighborhoodPulseScore}</strong><span>pulse</span>
              </div>
            </div>

            <div className="metric-grid">
              <article><span>Nearby places</span><strong>{neighborhoodInsights.totalNearbyPlaces}</strong><small>Inside your radius</small></article>
              <article><span>Service coverage</span><strong>{neighborhoodInsights.serviceCoveragePercentage}%</strong><small>Configured dimensions represented</small></article>
              <article><span>Average nearest</span><strong>{formatDistance(neighborhoodInsights.averageNearestServiceDistance)}</strong><small>Across represented service types</small></article>
              <article><span>Closest place</span><strong>{formatDistance(neighborhoodInsights.closestPlace?.distanceInMeters)}</strong><small>{neighborhoodInsights.closestPlace?.name || "—"}</small></article>
            </div>

            <div className="insight-grid">
              <div className="breakdown-card">
                <div className="card-title-row"><h3>Service mix</h3><span>Count of places</span></div>
                <div className="bar-list">
                  {neighborhoodInsights.categoryBreakdown.map((category) => {
                    const maximumCount = Math.max(...neighborhoodInsights.categoryBreakdown.map((item) => item.count), 1);
                    return (
                      <div className="bar-item" key={category.category}>
                        <div><span>{category.label}</span><strong>{category.count}</strong></div>
                        <div className="bar-track"><i style={{ width: `${(category.count / maximumCount) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="insight-story-card">
                <p className="eyebrow">WHAT THE DATA SUGGESTS</p>
                <h3>
                  {neighborhoodInsights.topCategory
                    ? `${neighborhoodInsights.topCategory.label} is the strongest nearby service signal.`
                    : "This area has limited coverage across the selected service dimensions."}
                </h3>
                <p>
                  The pulse score combines service coverage with proximity. A place receives a stronger signal when more service dimensions are represented and their nearest examples are closer to the selected anchor.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="nearby-section">
        <div className="section-heading">
          <div><p className="eyebrow">DRILL DOWN</p><h2>Nearby service directory</h2></div>
          <p>Click any nearby place to inspect the source record behind the insight.</p>
        </div>
        <div className="nearby-layout">
          <div className="nearby-table-card">
            <div className="table-header"><span>Place</span><span>Type</span><span>Distance</span></div>
            {!neighborhoodInsights?.nearbyPlaces?.length ? (
              <div className="table-empty">Run an analysis to populate nearby places.</div>
            ) : neighborhoodInsights.nearbyPlaces.map((nearbyPlace, index) => (
              <button
                className={`nearby-table-row ${selectedNearbyPlace?.place?.id === nearbyPlace.place?.id ? "selected" : ""}`}
                key={nearbyPlace.place?.id || `${nearbyPlace.name}-${index}`}
                onClick={() => setSelectedNearbyPlace(nearbyPlace)}
              >
                <span>{nearbyPlace.name}</span>
                <span>{nearbyPlace.category.replaceAll("_", " ")}</span>
                <span>{formatDistance(nearbyPlace.distanceInMeters)}</span>
              </button>
            ))}
          </div>

          <aside className="detail-card">
            <p className="eyebrow">SOURCE RECORD</p>
            {selectedNearbyPlace ? (
              <>
                <h3>{selectedNearbyPlace.name}</h3>
                <dl>
                  <div><dt>Distance</dt><dd>{formatDistance(selectedNearbyPlace.distanceInMeters)}</dd></div>
                  <div><dt>New Primary Category</dt><dd>{getPlacePrimaryCategory(selectedNearbyPlace.place).replaceAll("_", " ")}</dd></div>
                  <div><dt>Locality</dt><dd>{getPlaceAddress(selectedNearbyPlace.place).locality || "—"}</dd></div>
                  <div><dt>Region</dt><dd>{getPlaceAddress(selectedNearbyPlace.place).region || "—"}</dd></div>
                  <div><dt>Country</dt><dd>{getPlaceAddress(selectedNearbyPlace.place).country || "—"}</dd></div>
                  <div><dt>Confidence</dt><dd>{Number.isFinite(Number(selectedNearbyPlace.place?.properties?.confidence)) ? `${Math.round(Number(selectedNearbyPlace.place.properties.confidence) * 100)}%` : "—"}</dd></div>
                </dl>
              </>
            ) : (
              <div className="detail-empty"><span>02</span><h3>Select a nearby place.</h3><p>The underlying Overture fields will appear here.</p></div>
            )}
          </aside>
        </div>
      </section>

      <section className="method-section" id="method">
        <p className="eyebrow">METHOD</p>
        <h2>From raw coordinates to a useful decision signal.</h2>
        <div className="method-steps">
          <article><strong>01</strong><h3>Discover</h3><p>Search Overture Places by country and an anchor category to create a real set of locations to investigate.</p></article>
          <article><strong>02</strong><h3>Measure</h3><p>Use the selected place's coordinates and a configurable radius to retrieve nearby service categories.</p></article>
          <article><strong>03</strong><h3>Aggregate</h3><p>Group the returned places by Overture's current taxonomy.primary field and calculate coverage, counts and proximity.</p></article>
          <article><strong>04</strong><h3>Explain</h3><p>Present a transparent pulse score and a drill-down directory so the insight can be inspected instead of blindly trusted.</p></article>
        </div>
      </section>

      <footer className="site-footer">
        <div><strong>Overture Neighborhood Pulse</strong><span>Transform data into discovery.</span></div>
        <span>Built around the Overture Maps Places API.</span>
      </footer>
    </main>
  );
}

export default App;
