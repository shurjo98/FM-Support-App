import { useState, type ReactNode } from "react";

export default function DetailModal({
  title,
  subtitle,
  images,
  description,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  images: string[];
  description?: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}>
          ✕
        </button>

        {images.length > 0 && (
          <div className="cust-modal-gallery">
            <img src={images[activeImage]} alt={title} />
            {images.length > 1 && (
              <div className="cust-modal-thumbs">
                {images.map((img, i) => (
                  <img
                    key={img}
                    src={img}
                    alt=""
                    className={i === activeImage ? "active" : ""}
                    onClick={() => setActiveImage(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <h2 className="cust-modal-title">{title}</h2>
        {subtitle && <div className="cust-modal-subtitle">{subtitle}</div>}
        {description && <p className="cust-modal-description">{description}</p>}

        {children && <div className="cust-modal-actions">{children}</div>}
      </div>
    </div>
  );
}
