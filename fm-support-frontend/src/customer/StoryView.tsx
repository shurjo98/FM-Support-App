import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentCard } from "../types";

// Full-screen, image-led presentation modeled on the App Store's "Today"
// stories: a tall hero image you swipe/tap through, with the headline and
// copy laid over a gradient at the bottom.
export default function StoryView({ card, onClose }: { card: ContentCard; onClose: () => void }) {
  const photos = [card.imageUrl, ...card.images];
  const [index, setIndex] = useState(0);

  function next() {
    setIndex((i) => Math.min(i + 1, photos.length - 1));
  }
  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="story-view-overlay" onClick={onClose}>
      <div className="story-view" onClick={(e) => e.stopPropagation()}>
        <button className="story-view-close" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2.5} />
        </button>

        {photos.length > 1 && (
          <div className="story-view-dots">
            {photos.map((_, i) => (
              <span key={i} className={`story-view-dot ${i === index ? "active" : ""}`} />
            ))}
          </div>
        )}

        <div className="story-view-image-wrap">
          <img src={photos[index]} alt={card.title} className="story-view-image" />
          {photos.length > 1 && (
            <>
              {index > 0 && (
                <button className="story-view-nav prev" onClick={prev} aria-label="Previous photo">
                  <ChevronLeft size={22} />
                </button>
              )}
              {index < photos.length - 1 && (
                <button className="story-view-nav next" onClick={next} aria-label="Next photo">
                  <ChevronRight size={22} />
                </button>
              )}
            </>
          )}
          <div className="story-view-gradient" />
        </div>

        <div className="story-view-content">
          {card.subtitle && <div className="story-view-eyebrow">{card.subtitle}</div>}
          <h2 className="story-view-title">{card.title}</h2>
          {card.body && <p className="story-view-body">{card.body}</p>}
        </div>
      </div>
    </div>
  );
}
