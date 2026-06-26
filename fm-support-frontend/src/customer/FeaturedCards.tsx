import { useEffect, useState } from "react";
import { fetchContentCards } from "../api";
import type { ContentCard } from "../types";
import DetailModal from "./DetailModal";

export default function FeaturedCards() {
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [openCard, setOpenCard] = useState<ContentCard | null>(null);

  useEffect(() => {
    fetchContentCards(true)
      .then(setCards)
      .catch(() => {});
  }, []);

  if (cards.length === 0) return null;

  return (
    <div className="featured-row">
      {cards.map((card) => (
        <button key={card.id} className="featured-card" onClick={() => setOpenCard(card)}>
          <img src={card.imageUrl} alt={card.title} className="featured-card-img" />
          <div className="featured-card-overlay">
            {card.subtitle && <div className="featured-card-eyebrow">{card.subtitle}</div>}
            <div className="featured-card-title">{card.title}</div>
          </div>
        </button>
      ))}

      {openCard && (
        <DetailModal
          title={openCard.title}
          subtitle={openCard.subtitle ?? undefined}
          images={[openCard.imageUrl]}
          description={openCard.body ?? undefined}
          onClose={() => setOpenCard(null)}
        />
      )}
    </div>
  );
}
