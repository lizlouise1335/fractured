/**
 * Sample articles and local storage management.
 */

const STORAGE_KEY = 'fractured_articles';

const sampleArticles = [
  {
    id: 'sample-1',
    title: 'The Geometry of Hydraulic Fracture Propagation in Heterogeneous Shale Formations',
    abstract: 'This paper examines how natural heterogeneities in shale formations — including bedding planes, pre-existing fractures, and variations in mineral composition — influence the propagation geometry of hydraulic fractures. Using AI-assisted modeling, we explore the complex interplay between injection pressure, rock mechanics, and geological structure.',
    author: 'AI Research Collaborative',
    category: 'Energy & Environment',
    tags: ['hydraulic fracturing', 'shale mechanics', 'geological modeling', 'AI simulation'],
    date: '2026-02-08',
    body: `## Introduction

Hydraulic fracturing — the process of injecting high-pressure fluid into subsurface rock formations to create fractures — is one of the most consequential engineering techniques of the modern era. Yet despite decades of application, the precise mechanics of fracture propagation remain incompletely understood, particularly in heterogeneous formations.

This research uses AI-assisted simulation to explore how geological complexity shapes fracture behavior in ways that simplified models often fail to capture.

## Background

### The Standard Model

Traditional hydraulic fracture models assume a relatively homogeneous, isotropic medium. The classic **PKN** (Perkins-Kern-Nordgren) and **KGD** (Khristianovic-Geertsma-de Klerk) models describe fracture growth as a function of:

- Injection rate and fluid viscosity
- In-situ stress state
- Rock elastic properties (Young's modulus, Poisson's ratio)
- Fracture toughness

These models produce idealized fracture geometries — planar, bi-wing fractures oriented perpendicular to the minimum horizontal stress.

### The Reality

Real formations are far more complex. Shale formations exhibit:

1. **Laminated bedding planes** that can arrest or redirect fracture growth
2. **Natural fracture networks** that interact with induced fractures
3. **Mineralogical heterogeneity** affecting local mechanical properties
4. **Pore pressure variations** that modify effective stress fields

> "The map is not the territory." — Alfred Korzybski

This aphorism applies directly: simplified fracture models are useful abstractions, but they diverge significantly from subsurface reality.

## Methodology

We employed a discrete element method (DEM) coupled with an AI surrogate model trained on 10,000+ simulated fracture scenarios. The AI model learned to predict:

- Fracture path deviation from the principal stress direction
- Branching probability at geological interfaces
- Net pressure evolution during propagation
- Stimulated reservoir volume (SRV) estimates

### Key Parameters

| Parameter | Range | Unit |
|-----------|-------|------|
| Injection rate | 5 – 80 | bbl/min |
| Fluid viscosity | 1 – 500 | cp |
| Horizontal stress anisotropy | 0.5 – 3.0 | MPa |
| Bedding plane spacing | 0.1 – 2.0 | m |

## Results

The AI model revealed several non-obvious patterns:

**1. Fracture Complexity Threshold**

There exists a critical stress anisotropy ratio below which fracture complexity increases dramatically. When the difference between maximum and minimum horizontal stress drops below ~1.5 MPa, natural fractures activate and the induced fracture transitions from planar to networked geometry.

**2. Bedding Plane Interaction**

Fractures approaching bedding planes at angles between 30° and 60° showed the highest probability of path deviation. Near-perpendicular approaches (>75°) typically crossed the interface without significant deflection.

**3. Viscosity-Complexity Tradeoff**

Lower viscosity fluids (slickwater) produced more complex fracture networks but with narrower individual fracture widths. Higher viscosity fluids created simpler, wider fractures with greater near-wellbore conductivity.

## Discussion

These findings have practical implications for completion design. The conventional approach of "one-size-fits-all" fracture treatments fails to account for the geological complexity that this research highlights.

An adaptive treatment strategy — where pumping parameters are adjusted in real-time based on pressure response signatures identified by AI pattern recognition — could significantly improve stimulation outcomes.

## Conclusion

Heterogeneity is not noise to be averaged away; it is the signal. AI-assisted modeling offers a path toward fracture designs that work *with* geological complexity rather than assuming it away. Future work will focus on integrating microseismic monitoring data with the AI surrogate model for real-time fracture geometry estimation.

---

*This article was generated through AI-assisted research exploration.*`
  },
  {
    id: 'sample-2',
    title: 'Proppant Transport in Complex Fracture Networks: A Machine Learning Approach',
    abstract: 'Understanding how proppant particles distribute within induced fracture networks is critical for maintaining long-term fracture conductivity. This study applies machine learning techniques to predict proppant placement patterns in complex, non-planar fracture geometries that deviate from idealized bi-wing assumptions.',
    author: 'AI Research Collaborative',
    category: 'Materials Science',
    tags: ['proppant transport', 'machine learning', 'fracture conductivity', 'fluid mechanics'],
    date: '2026-02-05',
    body: `## Introduction

After a hydraulic fracture is created, its long-term productivity depends on whether it remains open against the compressive forces of the surrounding rock. **Proppant** — typically sand or engineered ceramic particles — is pumped into the fracture to "prop" it open, maintaining a conductive pathway for hydrocarbon flow.

The challenge: proppant doesn't distribute evenly. Gravity, fluid dynamics, fracture geometry, and particle-particle interactions create complex settling patterns that determine whether a fracture produces effectively or chokes.

## The Transport Problem

Proppant transport involves coupled physics across multiple scales:

- **Macro-scale**: Slurry flow through the fracture network
- **Meso-scale**: Particle clustering, bridging, and screenout
- **Micro-scale**: Individual particle settling and wall interaction

Traditional Eulerian-Eulerian and Eulerian-Lagrangian approaches struggle with the computational cost of resolving all three scales simultaneously, especially in complex (non-planar) fracture geometries.

## Machine Learning Framework

We developed a hybrid physics-ML framework:

1. **Training data generation**: High-fidelity CFD-DEM simulations of proppant transport in 5,000 fracture geometries
2. **Feature engineering**: Fracture aperture maps, fluid velocity fields, and particle concentration as input features
3. **Model architecture**: A convolutional neural network (CNN) operating on discretized fracture planes
4. **Prediction target**: Final proppant concentration maps after shut-in and settling

### Model Performance

The ML model achieved:

- **R² = 0.91** on held-out test geometries
- **87% reduction** in computation time vs. full CFD-DEM
- Accurate prediction of proppant dune height within ±8% error

## Key Findings

### 1. The "Dead Zone" Problem

In branched fracture networks, secondary fractures receive significantly less proppant than the primary fracture. Our model predicts that fractures branching at angles > 45° from the main fracture receive less than 20% of the proppant concentration of the primary wing.

> These "dead zones" may close entirely once pumping stops, contributing zero conductivity to the well despite being part of the stimulated volume.

### 2. Pulse Injection Benefits

The ML model identified that **pulsed proppant injection** — alternating proppant-laden and clean fluid stages — improves proppant distribution in complex networks by 15-30% compared to continuous injection. The clean fluid stages allow partial settling that creates "pillars" of proppant rather than continuous packs.

### 3. Particle Size Optimization

Smaller proppant (100 mesh) penetrates deeper into secondary fractures but provides less conductivity per unit volume. The model suggests a **staged approach**: begin with fine-mesh proppant to establish conductivity in far-field fractures, then transition to coarser proppant (20/40 mesh) for near-wellbore conductivity.

## Implications

This work demonstrates that machine learning can serve as a practical tool for **completion optimization**, enabling engineers to:

- Predict proppant placement before pumping
- Optimize injection schedules for specific fracture geometries
- Estimate effective (propped) fracture area vs. total fracture area

## Conclusion

The gap between stimulated fracture area and effective propped area is one of the key uncertainties in unconventional well performance. Machine learning bridges the computational gap that has prevented routine proppant transport modeling in complex geometries, bringing this analysis within reach for everyday engineering decisions.

---

*This article was generated through AI-assisted research exploration.*`
  },
  {
    id: 'sample-3',
    title: 'Microseismic Event Classification Using Transformer Networks',
    abstract: 'Microseismic monitoring during hydraulic fracturing generates thousands of seismic events that must be classified and interpreted in near-real-time. This paper presents a Transformer-based neural network that classifies microseismic events by source mechanism — distinguishing between tensile fracture opening, shear slip on pre-existing planes, and operational noise.',
    author: 'AI Research Collaborative',
    category: 'Artificial Intelligence',
    tags: ['microseismic', 'transformer networks', 'signal classification', 'real-time monitoring'],
    date: '2026-01-28',
    body: `## Introduction

When rock fractures underground, it releases seismic energy. During hydraulic fracturing operations, arrays of geophones — either in monitoring wells or on the surface — record these **microseismic events**. Each event is a window into subsurface mechanics: where the rock is breaking, how it's breaking, and what type of failure is occurring.

The challenge is scale. A single fracturing stage can generate **hundreds to thousands** of detectable events. Manual classification is impractical. Automated methods are essential.

## Source Mechanisms

Microseismic events during hydraulic fracturing fall into three primary categories:

### Tensile Opening (Mode I)
- Pure opening of new fracture surfaces
- Indicates creation of new fracture volume
- Characterized by positive volumetric components in the moment tensor

### Shear Slip (Mode II/III)
- Sliding along pre-existing planes of weakness
- Indicates reactivation of natural fractures or bedding planes
- Characterized by double-couple radiation patterns

### Operational Noise
- Perforation shots, plug setting, pump cavitation
- Not indicative of rock failure
- Must be identified and excluded from fracture analysis

## The Transformer Approach

### Why Transformers?

Microseismic waveforms are **sequential data** with long-range dependencies. The arrival time, amplitude, and frequency content at different receiver stations are interrelated in ways that depend on:

- Source-receiver geometry
- Velocity model of the subsurface
- Source mechanism and orientation

Transformers excel at modeling these long-range dependencies through **self-attention**, making them well-suited for this classification task.

### Architecture

Our model processes multi-channel waveform data:

- **Input**: 32-channel waveform windows (500ms, sampled at 2000 Hz)
- **Encoding**: 1D convolutional feature extraction per channel
- **Transformer**: 6-layer encoder with 8-head attention
- **Output**: Probability distribution over 3 classes + event quality score

### Training Data

We assembled a labeled dataset of 45,000 microseismic events from 12 different wells across three basins:

- Permian Basin (West Texas)
- Marcellus Shale (Appalachia)
- Montney Formation (British Columbia)

Events were labeled by experienced geophysicists using full moment tensor inversion as ground truth.

## Results

### Classification Accuracy

| Class | Precision | Recall | F1 Score |
|-------|-----------|--------|----------|
| Tensile | 0.94 | 0.91 | 0.92 |
| Shear | 0.89 | 0.93 | 0.91 |
| Noise | 0.97 | 0.96 | 0.96 |

**Overall accuracy: 93.2%** on the held-out test set.

### Attention Visualization

Analysis of the attention weights revealed that the model learned physically meaningful patterns:

1. **P-wave onset alignment**: The model attends strongly to the first-arrival times across channels, effectively learning the velocity model
2. **Polarity patterns**: Attention maps show that the model compares first-motion polarities across the receiver array — the same technique geophysicists use for focal mechanism determination
3. **Frequency discrimination**: The model attends to different frequency bands for different classification decisions, consistent with the known spectral differences between source types

## Real-Time Performance

The model processes events in **<15ms per event** on a standard GPU, enabling real-time classification during operations. This speed allows for:

- Live updating of fracture type maps
- Immediate detection of anomalous event clusters
- Automated alerts when shear-dominant behavior suggests fault reactivation

## Conclusion

Transformer networks provide an effective and interpretable framework for microseismic event classification. The attention mechanism not only achieves high accuracy but does so by learning physically meaningful features, building confidence that the model generalizes beyond its training data. This represents a step toward truly intelligent real-time fracture monitoring.

---

*This article was generated through AI-assisted research exploration.*`
  }
];

/**
 * Load articles from localStorage, seeding with samples if empty.
 */
function loadArticles() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored articles:', e);
    }
  }
  // Seed with sample articles
  saveArticles(sampleArticles);
  return [...sampleArticles];
}

/**
 * Save articles to localStorage.
 */
function saveArticles(articles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

/**
 * Generate a unique ID for new articles.
 */
function generateId() {
  return 'article-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

/**
 * Format a date string for display.
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
