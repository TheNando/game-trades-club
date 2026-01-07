import { useState } from "preact/hooks";

interface GameIdProps {
  id: string;
}

export default function GameId({ id }: GameIdProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = async () => {
    setHovered(true);
    if (!imageUrl && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`/api/bgg_image?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setImageUrl(data.url);
        }
      } catch (e) {
        console.error("Failed to fetch image", e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <div
      class="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span class="border-b border-dotted border-gray-500">
        [{id}]
      </span>

      {hovered && (
        <div class="absolute z-50 left-full top-0 ml-2 p-2 bg-white border border-gray-200 rounded shadow-xl w-40 h-40 flex items-center justify-center">
          {loading ? (
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={`Game ${id}`}
              class="w-full h-full object-contain"
            />
          ) : (
            <span class="text-xs text-gray-500 text-center">No image</span>
          )}
        </div>
      )}
    </div>
  );
}
