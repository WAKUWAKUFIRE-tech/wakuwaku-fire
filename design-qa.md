# FIRE人生時計 — 添付デザイン QA

## Visual truth

- Source: `C:/Users/syuns/Documents/ChatGPT/使いきれ！/.codex-remote-attachments/01a08b26-f269-7a33-b118-203972d719b0/3e75dd4a-daae-48ea-8b1f-bd887251395f/1-Photo-1.jpg`
- Source size: 576 × 1280 px. The device status bar and bottom home indicator are treated as capture chrome; the app card is the visual reference.
- State used for comparison: profile calculated with age 36, average-life tab selected, sample values retained (average 88, health 75).
- Implementation capture: `design-qa-assets/life-clock-average.png`
- Focused card comparison: `design-qa-assets/life-card-focus-comparison.png`
- Full comparison: `design-qa-assets/comparison-average.png`
- Viewport: 576 × 1280 CSS px, device scale factor 1.

## Review

| Area | Evidence and result |
| --- | --- |
| Layout and spacing | The life card is the first dashboard card, with the segmented control, ring, countdown row, and explanatory note in the same vertical rhythm as the reference. Mobile padding, rounded corners, and the lower budget card remain usable at 320–576 px. **Pass** |
| Typography | Large tabular remaining-year value, compact Japanese labels, muted supporting text, and bold selected-tab label preserve the reference hierarchy. **Pass** |
| Color and contrast | The selected tab uses the requested red, the progress ring uses the requested yellow, and the dark card keeps warm high-contrast text. The original purple palette and consumption bar are absent from this card. **Pass** |
| Controls and state | `平均寿命` and `健康寿命` are semantic tabs. `aria-selected`, the subtitle, ring label, countdown, and explanatory note update together; the selected state is persisted locally. **Pass** |
| Copy | The card says `あなたの残り時間`, shows the current age and selected horizon, and keeps the health-life explanation available through the tab. `人生の消化率` is intentionally omitted per request. **Pass** |
| Imagery and assets | No external image or decorative icon was introduced into the card. The ring is an accessible data visualization, while the existing brand icon remains unchanged. **Pass** |
| Accessibility and responsive behavior | Axe WCAG A/AA audit has zero violations. Keyboard focus styling remains visible, and browser checks show no horizontal overflow at 320, 390, 768, or 1280 px. **Pass** |

## Comparison notes

The reference uses a near-black mobile surface and purple accents. The implementation keeps the same card composition and information density while applying the requested red/yellow treatment and removing the consumption-rate row. The surrounding site retains its existing light brand shell so the new card reads as the app’s focused centerpiece.

## Final result

passed

