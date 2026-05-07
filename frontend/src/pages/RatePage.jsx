import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { SenseRatingInput } from '../components/common/SenseScore';
import './RatePage.css';

export default function RatePage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: senses, 2: review text, 3: done
  const [scores, setScores] = useState({});
  const [reviewText, setReviewText] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/businesses/${businessId}`)
      .then(r => setBusiness(r.data))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleScoreChange = (sense, value) => {
    setScores(s => ({ ...s, [sense]: value }));
  };

  const hasAnyScore = Object.values(scores).some(v => v != null);

  const handleSubmit = async () => {
    if (!hasAnyScore) { setError('Rate at least one sense to continue'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/ratings', {
        business_id: business.id,
        ...scores,
        review_text: reviewText.trim() || undefined,
        visit_date: visitDate || undefined,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const avgScore = () => {
    const vals = Object.values(scores).filter(v => v != null);
    if (!vals.length) return 0;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (step === 3) return (
    <div className="page rate-done">
      <div className="rate-done-content animate-slide-up">
        <div className="done-emoji">🎉</div>
        <h1>Review Submitted!</h1>
        <p>Your sensory rating for <strong>{business?.name}</strong> has been saved.</p>
        <div className="done-score">
          <span className="done-score-num">{avgScore()}</span>
          <span className="done-score-label">Overall Score</span>
        </div>
        <div className="done-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/business/${business.slug}`)}>
            View Business
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page rate-page">
      {/* Header */}
      <div className="rate-header">
        <button className="btn btn-ghost" onClick={() => step === 1 ? navigate(-1) : setStep(1)}>
          ← {step === 1 ? 'Back' : 'Edit Senses'}
        </button>
        <div className="rate-steps">
          <div className={`rate-step ${step >= 1 ? 'active' : ''}`} />
          <div className={`rate-step ${step >= 2 ? 'active' : ''}`} />
        </div>
      </div>

      {/* Business info */}
      <div className="rate-biz-info">
        {business?.cover_image_url && (
          <img src={business.cover_image_url} className="rate-biz-img" alt={business.name} />
        )}
        <div>
          <h2 className="rate-biz-name">{business?.name}</h2>
          <p className="rate-biz-meta">{business?.category} · {business?.city}</p>
        </div>
      </div>

      {step === 1 && (
        <div className="rate-body animate-fade-in">
          <div className="rate-prompt">
            <h1>How did it feel?</h1>
            <p>Rate each sense you experienced. Leave blank if it didn't apply.</p>
          </div>

          <div className="card rate-scores-card">
            <SenseRatingInput values={scores} onChange={handleScoreChange} />
          </div>

          {hasAnyScore && (
            <div className="rate-avg-preview animate-fade-in">
              <span className="avg-label">Average Score</span>
              <span className="avg-val">{avgScore()} / 5</span>
            </div>
          )}

          {error && <div className="rate-error">{error}</div>}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'auto' }}
            onClick={() => { if (!hasAnyScore) { setError('Rate at least one sense'); return; } setStep(2); setError(''); }}
            disabled={!hasAnyScore}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rate-body animate-fade-in">
          <div className="rate-prompt">
            <h1>Tell the story</h1>
            <p>Describe your experience in words (optional)</p>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <textarea
              className="input rate-textarea"
              placeholder="What made this place memorable? What would you tell a friend?"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={5}
              maxLength={2000}
            />
            <div className="textarea-count">{reviewText.length}/2000</div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <label className="field-label">When did you visit?</label>
            <input
              type="date"
              className="input"
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {error && <div className="rate-error">{error}</div>}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Submit Review ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
