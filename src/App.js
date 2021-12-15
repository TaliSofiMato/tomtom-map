import { useState, useRef, useEffect } from 'react'
import * as tt from '@tomtom-international/web-sdk-maps';
import * as ttapi from '@tomtom-international/web-sdk-services'; 
import './App.css'
import '@tomtom-international/web-sdk-maps/dist/maps.css'


const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({})
  const [latitude, setLatitude] = useState(51.504)
  const [longitude, setLongitude] = useState(0.112869)

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': 'red',
        'line-width': 6
      }
    })
  }
  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
      .setLngLat(lngLat)
      .addTo(map)
  }
  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude
    }

    const destinations = []

    let map = tt.map({
      key: process.env.REACT_APP_TOMTOM_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true
      },
      center: [longitude, latitude],
      zoom: 14
    })
    setMap(map)

    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -25]
      }
      const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is You/You!')
      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map)
      marker.on('dragend', () => {
        const lngLat = marker.gerLngLat()
        setLongitude(lngLat.lng)
        setLatitude(lngLat.lag)

      })

      marker.setPopup(popup).togglePopup()

    }
    addMarker()

    const sortDestinations = (location) => {
      const pointsForDestinations = location.map((destination) => {
        return convertToPoints(destination)
      })
      const callParameters = {
        key: process.env.REACT_APP_TOMTOM_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }

      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0]
            const resultsArray = results.map((results, index) => {
              return {
                location: location[index],
                drivingtime: results.response.routeSummary.travelTimeInSeconds
              }
            })
            resultsArray.sort((a, b) => {
              return a.drivingtime - b.drivingtime
            })
            const sortedLocation = resultsArray.map((result) => {
              return result.location
            })
            resolve(sortedLocation)
          })
      })
    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_TOMTOM_API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
          })
      })
    }


    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDeliveryMarker(e.lngLat, map)
      recalculateRoutes()
    })

    return () => { map.remove() }
  }, [longitude, latitude])

  return (
    <>
      {map && (
        <div className="app">
          <div ref={mapElement} className='map' />
          <div className="search-bar"></div>
          <h1>Where to?</h1>
          <input
            type="text"
            id="longitude"
            className="longitude"
            placeholder="put on Longitude"
            onChange={(e) => { setLongitude(e.target.value) }}
          />
          <input
            type="text"
            id="latitude"
            className="latitude"
            placeholder="put on Latitude"
            onChange={(e) => { setLatitude(e.target.value) }}
          />
        </div>
      )}

    </>
  )
}

export default App;
