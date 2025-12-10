interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  rowsPerPage: number;
  onRowsChange: (n: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  rowsPerPage,
  onRowsChange,
}: Props) {
  return (
    <div className="flex justify-between items-center p-4 bg-[#121A33] border border-[#1E2A45] rounded-b-xl text-white">

      {/* Left: Rows per page */}
      <div className="flex items-center gap-2">
        <span className="text-gray-300">Показать:</span>

        <select
          className="bg-[#1A243F] border border-[#1E2A45] text-white p-1 rounded"
          value={rowsPerPage}
          onChange={(e) => onRowsChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* Right: Pagination controls */}
      <div className="flex gap-3 items-center text-lg">

        {/* First */}
        <button
          className="px-2 text-gray-300 hover:text-white disabled:text-gray-600"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
        >
          {"<<"}
        </button>

        {/* Prev */}
        <button
          className="px-2 text-gray-300 hover:text-white disabled:text-gray-600"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          {"<"}
        </button>

        {/* Page counter */}
        <span className="font-medium text-gray-200">
          {page} / {totalPages || 1}
        </span>

        {/* Next */}
        <button
          className="px-2 text-gray-300 hover:text-white disabled:text-gray-600"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          {">"}
        </button>

        {/* Last */}
        <button
          className="px-2 text-gray-300 hover:text-white disabled:text-gray-600"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}
