import React from 'react'
import { useState } from 'react'
import Button from '../components/Button'
export default function Navigation() {
  return (
    <>
    <div className="w-full flex flex-col justify-center items-center">
      <div className="flex flex-row gap-4">
          <button class="rounded-lg cursor-pointer bg-fuchsia-400 px-6" >Previous</button>
    <button class=" bg-amber-300 rounded-lg cursor-pointer px-6"> Select</button>
    <button class="bg-fuchsia-400 rounded-lg cursor-pointer px-6" >Next </button>
      </div>
      <div className="flex flex-row gap-5 mt-4">
            <button className="rounded-lg bg-emerald-500 cursor-pointer p-2 px-6">Back</button>
    <button className="rounded-lg bg-blue-500 cursor-pointer px-6">menu</button>
    <button className="rounded-lg bg-emerald-500 cursor-pointer px-6">refresh</button>
      </div>
    </div>
    </>
  )
}
