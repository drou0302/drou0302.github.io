import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['science', 'startup', 'personal']),
    description: z.string(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['research', 'startup', 'personal', 'hobby', 'education']),
    status: z.enum(['active', 'completed', 'paused']),
    link: z.string().optional(),
    year: z.number().optional(),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: 'index.md', base: './src/content/about' }),
  schema: z.object({
    intro: z.string(),
    background: z.string(),
    current_work: z.string(),
    location: z.string().default('Bern, Switzerland'),
    affiliation: z.string().optional(),
    network_nodes: z.array(z.string()).default([]),
  }),
});

const cv = defineCollection({
  loader: glob({ pattern: 'index.json', base: './src/content/cv' }),
  schema: z.object({
    positions: z.array(z.object({
      role: z.string(),
      org: z.string(),
      org_url: z.string().optional(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      description: z.string().optional(),
    })),
    education: z.array(z.object({
      degree: z.string(),
      field: z.string(),
      institution: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
    })),
    publications: z.array(z.object({
      authors: z.string(),
      role: z.enum(['first', 'co-first', 'corresponding', 'co-corresponding', 'contributing']).optional(),
      title: z.string(),
      journal: z.string(),
      year: z.number(),
      doi: z.string().optional(),
      pdb_ids: z.array(z.string()).default([]),
    })).default([]),
    presentations: z.array(z.object({
      title: z.string(),
      venue: z.string(),
      location: z.string().optional(),
      year: z.number(),
      type: z.enum(['talk', 'poster', 'invited']),
    })).default([]),
    prizes: z.array(z.object({
      title: z.string(),
      awarded_by: z.string(),
      year: z.number(),
      description: z.string().optional(),
    })).default([]),
    funding: z.array(z.object({
      title: z.string(),
      funder: z.string(),
      amount: z.string().optional(),
      start: z.string(),
      end: z.string(),
      role: z.enum(['PI', 'Co-PI', 'Collaborator']).optional(),
    })).default([]),
    skills: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, projects, about, cv };
