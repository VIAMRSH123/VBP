"""Representative Recommendation Service — Blueprint Part 7 / Part 2 Phase 3."""
from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.models.representative import Representative
from app.prompts.library import REPRESENTATIVE_RECOMMENDATION_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

WEIGHT_TERRITORY = 0.4
WEIGHT_PRODUCT = 0.3
WEIGHT_LANGUAGE = 0.15
WEIGHT_WORKLOAD = 0.15
MAX_WORKLOAD_FOR_SCORE = 20


def _score_candidate(rep: Representative, territory: str, product_category: str, language: str) -> float:
    score = 0.0
    if territory and rep.territory and territory.lower() == rep.territory.lower():
        score += WEIGHT_TERRITORY
    elif territory and rep.region and territory.lower() == rep.region.lower():
        score += WEIGHT_TERRITORY * 0.5

    if product_category and rep.product_category and product_category.lower() in rep.product_category.lower():
        score += WEIGHT_PRODUCT

    if language and rep.language and language.lower() == rep.language.lower():
        score += WEIGHT_LANGUAGE
    elif not language:
        score += WEIGHT_LANGUAGE * 0.5

    workload_factor = max(0.0, 1 - (rep.workload / MAX_WORKLOAD_FOR_SCORE))
    score += WEIGHT_WORKLOAD * workload_factor

    return round(min(1.0, score), 3)


def _heuristic_match(db: Session, territory: str, product_category: str, language: str) -> dict:
    reps = db.query(Representative).filter(Representative.active == True).all()  # noqa: E712
    scored = [
        {
            "representative_id": rep.id,
            "representative_code": rep.representative_code,
            "representative_name": rep.name,
            "confidence": _score_candidate(rep, territory, product_category, language),
            "reasoning": f"territory={rep.territory}, category={rep.product_category}, "
            f"language={rep.language}, workload={rep.workload}",
        }
        for rep in reps
    ]
    scored.sort(key=lambda c: c["confidence"], reverse=True)
    return {"candidates": scored[:3]}


def recommend_representative(
    db: Session, territory: str, product_category: str, language: str = "", lead_id: str = ""
) -> dict:
    used_llm = False
    result = _heuristic_match(db, territory, product_category, language)

    if claude_client.is_available() and result["candidates"]:
        try:
            reps = db.query(Representative).filter(Representative.active == True).all()  # noqa: E712
            candidate_summary = (
                f"Lead territory={territory}, product_category={product_category}, language={language}. "
                f"Representatives: "
                + "; ".join(
                    f"{r.id}:{r.name} territory={r.territory} products={r.product_category} "
                    f"lang={r.language} workload={r.workload}"
                    for r in reps
                )
            )
            llm_result = claude_client.complete_json(REPRESENTATIVE_RECOMMENDATION_PROMPT, candidate_summary)
            if llm_result.get("candidates"):
                result = llm_result
                used_llm = True
        except Exception:
            pass

    top_confidence = result["candidates"][0]["confidence"] if result["candidates"] else 0.0
    log_decision(
        db,
        lead_id=lead_id,
        skill="representative_matching",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=f"territory={territory}, product_category={product_category}, language={language}",
        output=result,
        confidence=top_confidence,
        used_llm=used_llm,
    )
    return result
