# rateuwclubs

A web platform where University of Waterloo students can discover and rate clubs.

**Live at:** https://rateuwclubs.ca

## Overview

There's no single place to find all the clubs at Waterloo. Information is scattered across WUSA, faculty pages, and word of mouth. Most clubs recruit in the first few weeks of term, so if you don't already know what's out there, you miss the window.

rateuwclubs pulls everything into one place. It aggregates 300+ clubs from multiple sources, lets students rate them, and surfaces the best ones through a ranked leaderboard. Every club links directly to its website or Instagram so you can actually find them.

## Tech Stack

- **Next.js** - full-stack framework (frontend + API routes), deployed on Vercel  
- **Supabase (PostgreSQL)** - database for clubs, votes, and user suggestions  
- **OpenAI (GPT-4.1-mini)** - generates concise club descriptions and powers deduplication  
- **Playwright** - headless browser scraping for structured club data  
- **Tailwind CSS** - UI styling  

## Data Pipeline

- Scraped 300+ clubs from three sources using Playwright: WUSA club directory, Sedra design team catalog, and UW Athletics rec clubs  
- Extracted club websites and Instagram links from detail pages, with shared helpers to filter out sitewide UW links and pick the best external link  
- Consolidated fragmented club data into a single structured database with deduplication (AI-assisted multi-pass matching + manual review)  
- Built a tag inference system to categorize clubs (Tech, Sports, Arts, Culture, etc.) using keyword matching with ~250 manual overrides  
- Generated short, standardized descriptions using GPT-4.1-mini and cached them in Supabase  

## Features

- Randomized club rating system with half star precision  
- Clickable club names that link directly to the club's website or Instagram  
- Tag based discovery mode for category specific exploration  
- Search functionality to quickly find specific clubs  
- Leaderboard ranked using Bayesian scoring to reduce bias from low sample sizes  
- User submitted club suggestions for missing entries  
