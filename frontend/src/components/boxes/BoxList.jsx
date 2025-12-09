export default function BoxList({ boxes, selectedBox, onSelectBox }) {

  const resolveStatus = (box) =>
    box.auto_status || box.current_status || box.status || "green";

  const getStatusColor = (status) => {
    const colors = {
      green: "bg-green-600",
      yellow: "bg-yellow-600",
      red: "bg-red-600",
      gray: "bg-gray-600",
    };
    return colors[status] || "bg-gray-600";
  };

  if (!boxes || boxes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Noch keine Boxen vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {boxes.map((box) => {
        const status = resolveStatus(box);

        return (
          <button
            key={box.id}
            onClick={() => onSelectBox(box)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedBox?.id === box.id
                ? "bg-blue-600 border-blue-400"
                : "bg-gray-700 border-gray-600 hover:border-gray-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${getStatusColor(
                    status
                  )} flex items-center justify-center`}
                >
                  <span className="text-white font-bold text-sm">
                    {box.number}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">
                    Box #{box.number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {box.box_type?.name}
                  </p>
                </div>
              </div>

              <div
                className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
