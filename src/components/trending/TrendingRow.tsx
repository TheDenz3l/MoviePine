"use client"
import React from 'react'
import MoviepireGrid, { MoviepireGridItem } from '@/components/moviepire-grid'

export interface TrendingRowProps<T extends MoviepireGridItem> {
	title: string
	items: T[]
	onPlay?: (id: string)=>void
	onAdd?: (id: string)=>void
	onInfo?: (id: string)=>void
}

// Lightweight adapter to retain compatibility with any previous imports.
// Renders a browse-replication MoviepireGrid scoped to a section.
export function TrendingRow<T extends MoviepireGridItem>({ title, items, onPlay, onAdd, onInfo }: TrendingRowProps<T>) {
	return (
		<section aria-label={title} className="px-2 md:px-6">
			<h2 className="text-xl font-semibold mb-4">{title}</h2>
			<MoviepireGrid
				items={items}
				browseReplication
				intentDelayMs={70}
				prefetchNeighbors
				enableKeyboardNav
				showMetadata
				minCardWidth={150}
				gap={8}
				className="rounded-lg ring-1 ring-white/5 bg-black/10 backdrop-blur-sm max-h-[70vh]"
				onPlay={id=>onPlay?.(id)}
				onAdd={id=>onAdd?.(id)}
				onInfo={id=>onInfo?.(id)}
			/>
		</section>
	)
}

export default TrendingRow
