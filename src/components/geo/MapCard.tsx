import { useState, useEffect } from "react";
import { Modal } from "flowbite-react";
import { Provider } from "@/interface/DatasetInterface";

interface MapCardProps {
  folderPath: string;
}

interface MapData {
  title: string;
  description: string;
  data_source: string[];
  provider: Provider;
}

export function MapCard({ folderPath }: MapCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [thumbnail, setThumbnail] = useState(`${folderPath}/preview.png`);
  const [mapFile, setMapFile] = useState(`${folderPath}/map.html`);
  const [jsonData, setJsonData] = useState<MapData | null>(null);

  useEffect(() => {
    async function fetchJsonData() {
      try {
        const response = await fetch(`${folderPath}/description.json`);
        const data = await response.json();
        setJsonData(data);
      } catch (error) {
        console.error("Error fetching JSON data:", error);
      }
    }

    fetchJsonData();
  }, [folderPath]);

  return (
    <div className="card" onClick={() => setShowModal(true)}>
      <img src={thumbnail} alt="thumbnail" />
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>Informations</Modal.Header>
        <Modal.Body>
          {/*      <pre>{JSON.stringify(jsonData, null, 2)}</pre> */}
          {mapFile && <iframe src={mapFile} width="100%" height="400px" />}
        </Modal.Body>
      </Modal>
    </div>
  );
}
