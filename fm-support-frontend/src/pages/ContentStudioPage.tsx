import { useEffect, useState } from "react";
import { createContentCard, deleteContentCard, fetchContentCards, updateContentCard, uploadContentImage } from "../api";
import type { ContentCard, InternalAccountLite } from "../types";

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
          Write up a new product, tip, or announcement with a photo — it shows up as a featured card
          on the customer portal homepage. Anyone on the team can post.
        </p>
        <button className="int-button" onClick={() => setShowEditor(true)}>
          + New Card
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="empty">No content yet. Create the first card above.</p>
      ) : (
        <div className="content-grid">
          {cards.map((card) => (
            <div key={card.id} className="content-grid-card">
              <div className="content-grid-thumb" style={{ backgroundImage: `url(${card.imageUrl})` }} />
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
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(existing?.imageUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(file: File | null) {
    setImageFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    if (!imageFile && !imageUrl) {
      setError("An image is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const uploaded = await uploadContentImage(imageFile);
        finalImageUrl = uploaded.url;
      }

      const card = existing
        ? await updateContentCard(existing.id, {
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            body: body.trim() || undefined,
            imageUrl: finalImageUrl,
          })
        : await createContentCard({
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            body: body.trim() || undefined,
            imageUrl: finalImageUrl,
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
          ✕
        </button>
        <h2 className="int-modal-title">{existing ? "Edit Card" : "New Card"}</h2>

        <div className="int-modal-fields">
          <label>
            Image
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
          </label>
          {previewUrl && (
            <div className="content-image-preview" style={{ backgroundImage: `url(${previewUrl})` }} />
          )}

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
            <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Full details shown when a customer opens the card" />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Saving..." : existing ? "Save changes" : "Publish card"}
          </button>
        </div>
      </div>
    </div>
  );
}
