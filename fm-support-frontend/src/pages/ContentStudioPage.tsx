import { useEffect, useState } from "react";
import { createContentCard, deleteContentCard, fetchContentCards, updateContentCard, uploadContentImage } from "../api";
import type { ContentCard, InternalAccountLite } from "../types";
import { ImagePlus, X, GripVertical } from "lucide-react";

export default function ContentStudioPage({ actingAccount }: { actingAccount: InternalAccountLite }) {
  const [cards, setCards] = useState<ContentCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);

  function load() {
    fetchContentCards(false)
      .then(setCards)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    try {
      await deleteContentCard(id);
      setCards((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  }

  async function handleTogglePublished(card: ContentCard) {
    try {
      const updated = await updateContentCard(card.id, { published: !card.published });
      setCards((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update card");
    }
  }

  if (error) return <div className="page-error">{error}</div>;
  if (!cards) return <div className="page-loading">Loading content studio...</div>;

  return (
    <div className="content-studio">
      <div className="kanban-toolbar">
        <p className="empty">
          Write up a new product, tip, or announcement as a multi-photo story — it shows up as a
          featured card on the customer portal homepage. Anyone on the team can post.
        </p>
        <button className="int-button" onClick={() => setShowEditor(true)}>
          + New Story
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="empty">No content yet. Create the first story above.</p>
      ) : (
        <div className="content-grid">
          {cards.map((card) => (
            <div key={card.id} className="content-grid-card">
              <div className="content-grid-thumb" style={{ backgroundImage: `url(${card.imageUrl})` }}>
                {card.images.length > 0 && <span className="content-photo-count">+{card.images.length} more</span>}
              </div>
              <div className="content-grid-body">
                <div className="content-grid-title-row">
                  <h3>{card.title}</h3>
                  <span className={`content-status-badge ${card.published ? "published" : "draft"}`}>
                    {card.published ? "Published" : "Draft"}
                  </span>
                </div>
                {card.subtitle && <p className="content-grid-subtitle">{card.subtitle}</p>}
                <p className="content-grid-meta">
                  By {card.createdByName} · {new Date(card.createdAt).toLocaleDateString()}
                </p>
                <div className="content-grid-actions">
                  <button className="int-button-secondary" onClick={() => setEditingCard(card)}>
                    Edit
                  </button>
                  <button className="int-button-secondary" onClick={() => handleTogglePublished(card)}>
                    {card.published ? "Unpublish" : "Publish"}
                  </button>
                  <button className="int-button-danger" onClick={() => handleDelete(card.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <ContentEditorModal
          actingAccountId={actingAccount.id}
          onClose={() => setShowEditor(false)}
          onSaved={(card) => {
            setCards((prev) => (prev ? [card, ...prev] : [card]));
            setShowEditor(false);
          }}
        />
      )}

      {editingCard && (
        <ContentEditorModal
          actingAccountId={actingAccount.id}
          existing={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={(card) => {
            setCards((prev) => prev?.map((c) => (c.id === card.id ? card : c)) ?? prev);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}

function ContentEditorModal({
  actingAccountId,
  existing,
  onClose,
  onSaved,
}: {
  actingAccountId: string;
  existing?: ContentCard;
  onClose: () => void;
  onSaved: (card: ContentCard) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  // First photo is the cover shown on the homepage carousel; the rest form
  // the swipeable story gallery a customer sees after tapping it.
  const [photos, setPhotos] = useState<string[]>(existing ? [existing.imageUrl, ...existing.images] : []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => uploadContentImage(file)));
      setPhotos((prev) => [...prev, ...uploads.map((u) => u.url)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    setPhotos((prev) => [prev[index]!, ...prev.filter((_, i) => i !== index)]);
  }

  async function handleSubmit() {
    if (!title.trim() || photos.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const [imageUrl, ...images] = photos;
      const card = existing
        ? await updateContentCard(existing.id, {
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            body: body.trim() || undefined,
            imageUrl,
            images,
          })
        : await createContentCard({
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            body: body.trim() || undefined,
            imageUrl,
            images,
            actingAccountId,
          });
      onSaved(card);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="int-modal-overlay" onClick={onClose}>
      <div className="int-modal" onClick={(e) => e.stopPropagation()}>
        <button className="int-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2 className="int-modal-title">{existing ? "Edit Story" : "New Story"}</h2>

        <div className="int-modal-fields">
          <label>Story photos (first one is the cover)</label>
          <div className="story-photo-grid">
            {photos.map((url, i) => (
              <div key={url + i} className="story-photo-thumb" style={{ backgroundImage: `url(${url})` }}>
                {i === 0 && <span className="story-cover-badge">Cover</span>}
                <button type="button" className="story-photo-remove" onClick={() => removePhoto(i)}>
                  <X size={12} strokeWidth={3} />
                </button>
                {i !== 0 && (
                  <button type="button" className="story-photo-make-cover" onClick={() => makeCover(i)} title="Make cover">
                    <GripVertical size={12} />
                  </button>
                )}
              </div>
            ))}
            <label className="story-photo-add">
              {uploading ? "Uploading..." : (
                <>
                  <ImagePlus size={20} strokeWidth={1.75} />
                  Add photos
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                disabled={uploading}
                hidden
              />
            </label>
          </div>

          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Jack A60 now in stock" />
          </label>
          <label>
            Subtitle
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A short one-liner shown under the title" />
          </label>
          <label>
            Body
            <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Full details shown when a customer opens the story" />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || uploading || !title.trim() || photos.length === 0}>
            {submitting ? "Saving..." : existing ? "Save changes" : "Publish story"}
          </button>
        </div>
      </div>
    </div>
  );
}
