import { CodeBlock } from "@/components/ui/code-block";
import {
  faCheck,
  faCopy,
  faPlus,
  faRemove,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import ReactApexChart from "react-apexcharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

interface DataItem {
  [key: string]: any;
}
// #region GraphComponent
export const GraphComponent: React.FC<{ data: DataItem[] }> = ({ data }) => {
  const numericCols: string[] = [];
  let defaultXAxis = "";
  let hasTimeXAxis = false;

  if (data.length > 0) {
    const firstRow = data[0];
    Object.keys(firstRow).forEach((col) => {
      const val = firstRow[col];
      if (
        col.toLowerCase().includes("uuid") ||
        col.toLowerCase().includes("id") ||
        col.toLowerCase().includes("key") ||
        col.toLowerCase().includes("code")
      ) {
        return;
      }
      if (!isNaN(parseInt(val))) {
        numericCols.push(col);
      }
      if (
        col.toLowerCase().includes("date") ||
        col.toLowerCase().includes("time") ||
        col.toLowerCase().includes("year")
      ) {
        if (!defaultXAxis) {
          defaultXAxis = col;
          hasTimeXAxis = true;
        }
      }
    });

    if (!defaultXAxis && numericCols.length) {
      defaultXAxis = numericCols[0];
    }
  }

  const getRandomNumericCol = () => {
    if (!numericCols.length) return "";
    const randomIndex = Math.floor(Math.random() * numericCols.length);
    return numericCols[randomIndex];
  };

  const [state, setState] = React.useState(() => {
    const firstY = getRandomNumericCol();
    const categories = data.map((row) => row[defaultXAxis]);
    const yAxisCols = firstY ? [firstY] : [];
    const series = yAxisCols.map((col) => ({
      name: col,
      data: data.map((row) => parseInt(row[col]) || 0),
    }));

    return {
      xAxis: defaultXAxis,
      yAxis: yAxisCols,
      hasTimeXAxis,
      chartData: {
        series,
        options: {
          chart: { type: "area" as const, height: 350 },
          dataLabels: { enabled: false },
          stroke: { curve: "smooth" as const },
          xaxis: {
            type: (hasTimeXAxis ? "datetime" : "category") as
              | "datetime"
              | "category",
            categories,
            labels: {
              show: true,
              style: {
                colors: "#61F53CFF",
                fontSize: "12px",
                cssClass: "apexcharts-xaxis-label",
              },
            },
          },
          yaxis: {
            labels: {
              style: {
                colors: "#0E9F6E",
                fontSize: "12px",
                cssClass: "apexcharts-xaxis-label",
              },
            },
          },
          tooltip: {
            x: { format: hasTimeXAxis ? "dd/MM/yy HH:mm" : undefined },
          },
        },
      },
    };
  });

  const handleXAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newXAxis = e.target.value;
    const categories = data.map((row) => row[newXAxis]);
    const isTime = ["time", "date", "year"].some((k) =>
      newXAxis.toLowerCase().includes(k)
    );

    setState((prev) => ({
      ...prev,
      xAxis: newXAxis,
      hasTimeXAxis: isTime,
      chartData: {
        ...prev.chartData,
        options: {
          ...prev.chartData.options,
          xaxis: {
            ...prev.chartData.options.xaxis,
            type: isTime ? "datetime" : "category",
            categories,
          },
        },
      },
    }));
  };

  const handleYColumnChange = (index: number, newCol: string) => {
    const newY = [...state.yAxis];
    newY[index] = newCol;
    setState((prev) => ({
      ...prev,
      yAxis: newY,
      chartData: {
        ...prev.chartData,
        series: newY.map((col) => ({
          name: col,
          data: data.map((row) => parseInt(row[col]) || 0),
        })),
      },
    }));
  };

  const handleAddY = () => {
    const unused = numericCols.find(
      (col) => !state.yAxis.includes(col) && col !== state.xAxis
    );
    if (!unused) return;
    setState((prev) => {
      const newY = [...prev.yAxis, unused];
      return {
        ...prev,
        yAxis: newY,
        chartData: {
          ...prev.chartData,
          series: newY.map((col) => ({
            name: col,
            data: data.map((row) => parseInt(row[col]) || 0),
          })),
        },
      };
    });
  };

  const handleRemoveY = (index: number) => {
    setState((prev) => {
      const newY = [...prev.yAxis];
      newY.splice(index, 1);
      return {
        ...prev,
        yAxis: newY,
        chartData: {
          ...prev.chartData,
          series: newY.map((col) => ({
            name: col,
            data: data.map((row) => parseInt(row[col]) || 0),
          })),
        },
      };
    });
  };

  return (
    <div className="text-gray-800 dark:text-gray-200">
      <ReactApexChart
        options={state.chartData.options}
        series={state.chartData.series}
        type="area"
        height={350}
      />
      <div className="flex flex-col sm:flex-row gap-4 mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <div className="">
          <label htmlFor="xCol" className="mr-2">
            Axe X:
          </label>
          <select
            id="xCol"
            onChange={handleXAxisChange}
            value={state.xAxis}
            className="p-1 bg-white dark:bg-gray-700 border dark:border-gray-600"
          >
            {[state.xAxis, ...numericCols]
              .filter((c, i, arr) => arr.indexOf(c) === i)
              .map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
          </select>
        </div>
        <div className="flex">
          <label className="mr-2">Axe(s) Y:</label>
          <div className="flex flex-col">
            {state.yAxis.map((col, idx) => (
              <div key={idx} className="mb-1 flex items-center">
                <select
                  className="p-1 bg-white dark:bg-gray-700 border dark:border-gray-600"
                  value={col}
                  onChange={(e) => handleYColumnChange(idx, e.target.value)}
                >
                  {numericCols
                    .filter((ncol) => ncol !== state.xAxis)
                    .map((ncol) => (
                      <option key={ncol} value={ncol}>
                        {ncol}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => handleRemoveY(idx)}
                  className="ml-2 text-red-500"
                >
                  <FontAwesomeIcon icon={faRemove} />
                </button>
              </div>
            ))}

            <button
              className="mt-1 bg-green-500 text-white p-1 rounded"
              onClick={handleAddY}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// #region TableComponent

export const renderTable = (preview: any[]) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full border-collapse text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
      <thead className="bg-gray-200 dark:bg-gray-700">
        <tr>
          {preview.length > 0 &&
            Object.keys(preview[0]).map((col) => (
              <th
                key={col}
                className="text-left p-2 capitalize border-b dark:border-gray-600"
              >
                {col.replace(/_/g, " ")}
              </th>
            ))}
        </tr>
      </thead>
      <tbody>
        {preview.map((item, idx) => (
          <tr key={idx} className="border-b dark:border-gray-600">
            {Object.values(item).map((val, colIndex) => (
              <td key={colIndex} className="p-2">
                {String(val)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// #region MapComponent

export const MapComponent: React.FC<{ geojson: any }> = ({ geojson }) => {
  const [tileLayer, setTileLayerUrl] = React.useState<string>(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  );
  /* Skin de map */
  const items = [
    {
      label: "OpenStreetMap",
      icon: "pi pi-map",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    },
    {
      label: "Dark Mode",
      icon: "pi pi-moon",
      url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    },
    {
      label: "Esri World Imagery",
      icon: "pi pi-globe",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    },
    {
      label: "CartoDB Positron",
      icon: "pi pi-map",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    },
    {
      label: "CartoDB Dark Matter",
      icon: "pi pi-moon",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    },
  ];

  return (
    <div className="h-96 ">
      <select
        onChange={(e) => setTileLayerUrl(e.target.value)}
        className="p-1 bg-white dark:bg-gray-700 border dark:border-gray-600 mb-2"
      >
        {items.map((item, index) => (
          <option key={index} value={item.url}>
            {item.label}
          </option>
        ))}
      </select>
      <pre className="text-sm font-semibold mb-4">{tileLayer}</pre>
      {/* <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileLayer}
        />
        <Marker position={[51.505, -0.09]}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer> */}
    </div>
  );
};

// #region CodeJson

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CodeJsonProps {
  data: any;
  fileName: string;
  extension: string;
}

export const CodeBlockArea: React.FC<CodeJsonProps> = ({
  data,
  fileName,
  extension,
}) => {
  const [copied, setCopied] = useState(false);
  const code = JSON.stringify(data, null, 2);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        maxHeight: "400px",
        overflow: "auto",
        paddingRight: "10px",
        scrollbarColor: "#6F15E6FF #f3f4f6",
        scrollBehavior: "smooth",
        borderRadius: "5px",
      }}
    >
      <div className="rounded-md relative -mt-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copyToClipboard(code)}
          className="h-8 w-8 absolute top-2 right-2 bg-green-500 text-white"
        >
          {copied ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
            </motion.div>
          ) : (
            <FontAwesomeIcon icon={faCopy} className="h-4 w-4" />
          )}
        </Button>
        <pre>{code}</pre>
      </div>
    </div>
  );
};
