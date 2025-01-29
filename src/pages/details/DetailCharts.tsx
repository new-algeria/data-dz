import { faPlus, faRemove } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import ReactApexChart from "react-apexcharts";

interface DataItem {
  [key: string]: any;
}

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
          dataLabels: { enabled: true },
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
