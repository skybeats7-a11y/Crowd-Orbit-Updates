# Crowd Orbit Remote UI v0.5.1

First full remote product release for the v0.5 Android engine.

## Social capture
- Recognised Instagram, TikTok, X/Twitter and YouTube profile links shared through Android **Share → Crowd Orbit** are now saved automatically rather than only prefilling the Capture form.
- Existing people are updated/deduplicated by handle or source URL through the existing local data layer.
- Shared information is not treated as private platform access; Crowd Orbit only uses the public link/text actually shared into the app.
- Social URLs pasted into Capture are recognised and the handle/name fields are prefilled where possible.

## Design
- New lighter creative-networking visual system using warm neutral surfaces, stronger typography and restrained Orbit IQ violet/SBM gold accents.
- Improved mobile safe-area treatment and bottom navigation.
- Less dark-dashboard styling and reduced visual heaviness while retaining a premium network-intelligence feel.

## People + Orbit IQ
- Person cards now expose a richer relationship view.
- Relationship drawer includes an Orbit IQ breakdown for relationship, relevance, reach and timing.
- Person details can be edited remotely through the existing local PATCH endpoint.
- Relationship interactions can be logged from the person view and displayed as a timeline.

## Home + Moves
- Home language is refocused around actionable network intelligence.
- Social auto-capture guidance is surfaced directly on Home and Capture.
- Campaign language is presented as Moves, emphasising outreach/follow-up actions.

## Updates
- Settings visibly confirms **REMOTE UPDATE ACTIVE · v0.5.1** so the remote delivery path can be verified without reinstalling an APK.
- The update URL field is hidden from normal use; the fixed free SBM update feed remains the source of truth.
