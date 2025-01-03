import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer } from 'react-leaflet';

function Map() {
    return (
        <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true} className="h-full w-full rounded-xl my-3">
            <TileLayer attributions='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
    );
}

export default Map;