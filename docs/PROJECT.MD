# PROJECT.md

> **Version:** 1.0.0
> **Status:** Planning
> **Author:** Reza
> **Project Type:** AI-Powered YouTube Video Generator
> **Last Updated:** 2026

---

## Overview

StoryZ adalah AI Production Studio yang menghasilkan video YouTube berdurasi 10–15 menit secara otomatis — mulai dari riset topik, penulisan naskah, pembuatan storyboard, generasi gambar, voice over, rendering, thumbnail, hingga upload ke YouTube.

StoryZ tidak berfokus pada image-to-video. Sebaliknya, StoryZ membangun video layaknya proses produksi film dokumenter menggunakan **Director Engine** sebagai pusat pengambilan keputusan seluruh pipeline.

---

## Primary Goals

- Generate video YouTube berkualitas tinggi secara otomatis
- Menjaga konsistensi visual dari awal hingga akhir video
- Menghasilkan video yang terlihat profesional meskipun menggunakan AI-generated images
- Mengurangi biaya operasional dengan memanfaatkan GitHub Actions sebagai rendering engine
- Memiliki workflow yang dapat di-regenerate pada setiap tahap tanpa mengulang keseluruhan proses

---

## Core Principles

### 1. Consistency First

Semua asset harus memiliki style yang sama. Director Engine memastikan tidak terjadi inkonsistensi seperti:

- Scene pertama realistis, scene tengah berubah menjadi anime
- Warna berubah drastis antar scene
- Karakter berubah wajah atau proporsi

### 2. Scene-Based Architecture

Video bukan dianggap sebagai satu file panjang, melainkan kumpulan scene independen.

Setiap scene memiliki properti:

| Property | Deskripsi |
|---|---|
| `narration` | Teks narasi yang dibacakan |
| `image` | Path ke gambar yang digunakan |
| `prompt` | Prompt yang digunakan untuk generate gambar |
| `camera` | Gerakan kamera (pan, zoom, static) |
| `duration` | Durasi scene dalam detik |
| `subtitle` | Teks subtitle |
| `effect` | Efek visual tambahan |

### 3. Everything is Regeneratable

Semua tahap pipeline dapat diulang secara independen tanpa mengulang tahap sebelumnya. Contoh: regenerate hanya satu scene image tanpa harus generate ulang seluruh storyboard.

### 4. JSON Driven

Seluruh project disimpan sebagai JSON. Renderer hanya membaca JSON — sehingga renderer dapat diganti kapan saja tanpa mengubah pipeline.

---

## System Workflow

```
Topic → Research → Director Engine → Outline → Script → Storyboard
→ Prompt Generation → Image Generation → Voice Generation
→ Subtitle → Rendering → Thumbnail → SEO → YouTube Upload
```

---

## Project Vision

StoryZ bukan sekadar menghasilkan video.

StoryZ bertujuan menjadi **AI Production Studio** yang mampu menghasilkan video dokumenter YouTube dengan kualitas profesional, workflow yang terstruktur, serta konsistensi visual tinggi melalui Director Engine sebagai pusat kendali seluruh pipeline AI.