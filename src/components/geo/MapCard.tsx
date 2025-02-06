import { useState, useEffect } from "react";
import { Modal } from "flowbite-react";
import { Provider } from "@/interface/DatasetInterface";
import { GlareCard } from "@/components/ui/glare-card";
import { useNavigate } from "react-router-dom";
import { Octokit } from "@octokit/core"; // Ajout de l'importation d'Octokit

interface MapCardProps {
  folderPath: string;
}

interface MapData {
  title: string;
  description: string;
  data_source: string[];
  provider: Provider;
}

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_COLLABORATORS_TOKEN,
});

export function MapCard({ folderPath }: MapCardProps) {
  const navigate = useNavigate();
  const [thumbnail, setThumbnail] = useState("");
  const [jsonData, setJsonData] = useState<MapData | null>(null);

  useEffect(() => {
    async function fetchJsonData() {
      try {
        const response = (await octokit.request(
          "GET /repos/{owner}/{repo}/contents/{path}",
          {
            owner: "new-algeria",
            repo: "geomatics",
            path: `${folderPath}/description.json`,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        )) as any;
        console.log(response.data);
        const data = JSON.parse(atob(response.data.content));
        setJsonData(data);
      } catch (error) {
        console.error("Error fetching JSON data:", error);
      }
    }

    async function fetchThumbnail() {
      try {
        const response = (await octokit.request(
          "GET /repos/{owner}/{repo}/contents/{path}",
          {
            owner: "new-algeria",
            repo: "geomatics",
            path: `${folderPath}/preview.png`,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        )) as any;
        const imageUrl = `data:image/png;base64,${response.data.content}`;
        setThumbnail(imageUrl);
      } catch (error) {
        console.error("Error fetching thumbnail:", error);
      }
    }

    fetchJsonData();
    fetchThumbnail();
  }, [folderPath]);

  const handleClick = () => {
    navigate(`/map/${folderPath.split("/").pop()}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <GlareCard className="flex flex-col items-center justify-center">
        <img
          src={thumbnail}
          alt="thumbnail"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4">
          <h3 className="text-white text-lg font-bold">{jsonData?.title}</h3>
          <p className="text-gray-300 text-sm text-center mt-2">
            {jsonData?.description}
          </p>
          <button
            className="bg-primary rounded-full w-fit text-white px-4 py-2 z-50 mt-5"
            onClick={handleClick}
          >
            Découvrir
          </button>
          {/* author */}
          <div className="flex items-center gap-2 mt-4">
            <img
              src={jsonData?.provider.pictureUrl}
              alt="author"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-white text-sm">
              {jsonData?.provider.name}
            </span>
          </div>
        </div>
      </GlareCard>
    </div>
  );
}
