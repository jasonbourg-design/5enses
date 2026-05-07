import { Link } from 'react-router-dom';
import { OverallScore, SenseDots } from './SenseScore';
import './BusinessCard.css';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];

export default function BusinessCard({ business, variant = 'default' }) {
  if (!business) return null;

  if (variant === 'horizontal') {
    return (
      <Link to={`/business/${business.slug}`} className="biz-card biz-card--h">
        <div className="biz-card__img-sm">
          {business.cover_image_url
            ? <img src={business.cover_image_url} alt={business.name} />
            : <div className="biz-card__img-placeholder">{business.name[0]}</div>
          }
        </div>
        <div className="biz-card__body">
          <h3 className="biz-card__name truncate">{business.name}</h3>
          <p className="biz-card__meta">
            {business.category}
            {business.city && ` · ${business.city}`}
            {business.price_range && ` · ${PRICE[business.price_range]}`}
          </p>
          {business.avg_overall && (
            <div className="biz-card__rating-row">
              <span className="rating-star">★</span>
              <span className="rating-num">{Number(business.avg_overall).toFixed(1)}</span>
              <span className="rating-count">({business.rating_count || 0})</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/business/${business.slug}`} className="biz-card card animate-fade-in">
      <div className="biz-card__img">
        {business.cover_image_url
          ? <img src={business.cover_image_url} alt={business.name} loading="lazy" />
          : <div className="biz-card__img-placeholder">{business.name[0]}</div>
        }
        {business.price_range && (
          <span className="biz-card__price">{PRICE[business.price_range]}</span>
        )}
      </div>
      <div className="biz-card__content">
        <div className="biz-card__header">
          <div>
            <h3 className="biz-card__name">{business.name}</h3>
            <p className="biz-card__category">{business.category} {business.city && `· ${business.city}`}</p>
          </div>
          {business.avg_overall != null && (
            <div className="biz-card__score">
              <span className="score-val">{Number(business.avg_overall).toFixed(1)}</span>
              <span className="score-star">★</span>
            </div>
          )}
        </div>
        {(business.avg_sight || business.avg_sound || business.avg_smell || business.avg_taste || business.avg_touch) && (
          <SenseDots scores={business} size="sm" />
        )}
        {business.rating_count > 0 && (
          <p className="biz-card__count">{business.rating_count} sensory reviews</p>
        )}
      </div>
    </Link>
  );
}
