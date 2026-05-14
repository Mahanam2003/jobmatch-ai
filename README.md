# JobMatch AI

I'm a third-year Informatics student at the University of Washington 
studying Data Science, and I built this while teaching myself Python 
to make my own job search less painful.

The idea came from a real frustration. I was spending hours on LinkedIn 
going through internships one by one, had no idea which ones were actually 
worth applying to, and kept rewriting my resume from scratch for every role. 
I figured if I was learning to code anyway, I might as well build something 
that actually solves the problem.

## What it does

JobMatch AI is a Chrome extension that lives in your browser while you job 
hunt. You open any job posting on LinkedIn, Handshake, Indeed, or Greenhouse, 
click the extension icon, and within a few seconds you get:

- A match score from 0 to 100 based on how well your resume fits that specific role
- The exact keywords you're missing that ATS systems flag during screening
- Rewrites of your actual bullet points tailored to the job — using your real experience, just reframed to land better
- One piece of honest recruiter advice on what would move the needle most

The AI is designed to think like a recruiter who specializes in Data Analytics, 
Sports Analytics, and Product Management internships. It never makes up 
experience you don't have — it just helps you present what's already there 
in a smarter way.

## How it works

There are two parts running together.

A small FastAPI server runs locally on your machine in the background. When 
you click Analyze on a job posting, the Chrome extension reads the job 
description directly off the page and sends it to that local server. The 
server calls Claude — Anthropic's AI model — with your resume already loaded 
as context. Claude analyzes the overlap between your background and the job 
requirements, then returns a structured breakdown: the match score, what's 
missing, rewritten versions of your bullet points, and one concrete piece 
of advice.

Everything happens on your machine. Nothing gets stored anywhere, no data 
goes to any third party except the Claude API call itself.

## What I learned building this

This was my first time building a Chrome extension and my first time writing 
a REST API from scratch. Getting the extension to communicate with the local 
server without CORS errors took way longer than I expected. Extracting job 
text reliably was also tricky — LinkedIn, Handshake, and Indeed all structure 
their HTML differently so I had to handle each site separately.

The hardest part was the prompt engineering. Getting Claude to rewrite bullet 
points without inventing experience required a lot of iteration. The final 
system prompt instructs it to only reframe what's already in the resume, 
never fabricate, and focus specifically on ATS keyword matching rather than 
just making things sound fancier.

## Stack

- Python + FastAPI + Uvicorn
- Claude by Anthropic
- Vanilla JavaScript Chrome Extension (Manifest V3)
