export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWFydGlubzE5ODkiLCJhIjoiY2s0OGZlMGwzMDBydzNsdGRpc3ZiZnh0cSJ9.9gtGT9oAYiACiDqDBzc7Ug';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/martino1989/ck48foumn3wst1cmr4jpi0405',
    scrollZoom: false
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  // 1. Toworzymy markup (znacznik na mapie)
  // 2. Do każdego markera dodajemy aktualne koordynaty z loopa (el.coordinates)
  // 3. Stworzone markery dodajemy do mapy, stworzonej troszkę wyżej
  // 4. Dodajemy też koordynaty do bounds(granice?) i towrzymy popup's z nazwami lokacji
  locations.forEach(el => {
    // Create marker
    const html = document.createElement('div');
    html.className = 'marker';

    new mapboxgl.Marker({
      element: html,
      anchor: 'bottom'
    })
      .setLngLat(el.coordinates)
      .addTo(map);

    // Add popup (żeby markery pokazywały co to za lokacja)
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(el.coordinates)
      .setHTML(`<p>Day ${el.day}: ${el.description}</p>`)
      .addTo(map);

    bounds.extend(el.coordinates);
  });

  // 5. Dodajemy bounds do mapy, żeby wyświetlała wszystkie lokacje z array, ta funkcja określi jak duży będzie zoom, żeby zmieściłi się nam markery.
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
