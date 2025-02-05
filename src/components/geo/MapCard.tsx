import { useState, useEffect } from "react";
import { Modal } from "flowbite-react";
import { Provider } from "@/interface/DatasetInterface";
import { GlareCard } from "@/components/ui/glare-card";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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

  const handleClick = () => {
    navigate(`/map/${folderPath.split('/').pop()}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <GlareCard className="flex flex-col items-center justify-center">
        <img src={thumbnail} alt="thumbnail" className="h-full w-full object-cover" />
      </GlareCard>
    </div>
  );
}