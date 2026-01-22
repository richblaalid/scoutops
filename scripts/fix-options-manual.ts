/**
 * Manual fixes for merit badges with Option A/B/C/D patterns
 *
 * This script applies targeted fixes to badges that couldn't be auto-transformed:
 * - Cleans inline option text from parent requirements
 * - Adds proper isAlternative and alternativesGroup fields
 * - For complex cases with duplicate IDs, restructures the requirements
 */

import * as fs from 'fs'
import * as path from 'path'

interface Subrequirement {
  id: string
  text: string
  subrequirements?: Subrequirement[]
  isAlternative?: boolean
  alternativesGroup?: string
}

interface Requirement {
  id: string
  text: string
  subrequirements?: Subrequirement[]
  requiredCount?: number
}

interface MeritBadge {
  code: string
  name: string
  requirements: Requirement[]
  [key: string]: unknown
}

interface SourceData {
  merit_badges: MeritBadge[]
  [key: string]: unknown
}

// Fix Radio merit badge
function fixRadio(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '8') {
      // Clean the parent text - remove inline option text
      const cleanText = 'Amateur and Professional Radio. Do ONE of the following options:'

      return {
        ...req,
        text: cleanText,
        requiredCount: 1,
        subrequirements: req.subrequirements?.map(sub => ({
          ...sub,
          isAlternative: sub.text.startsWith('Option'),
          alternativesGroup: 'Radio-req-8',
        })),
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Skating merit badge
function fixSkating(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '2') {
      // Clean the parent text
      const cleanText = 'Working under the supervision of an experienced adult, do ONE of the following options: Option A—Ice Skating, Option B—Roller Skating, Option C—In-Line Skating, or Option D—Skateboarding.'

      return {
        ...req,
        text: cleanText,
        requiredCount: 1,
        subrequirements: req.subrequirements?.map(sub => ({
          ...sub,
          isAlternative: sub.text.startsWith('Option'),
          alternativesGroup: 'Skating-req-2',
        })),
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Snow Sports merit badge
function fixSnowSports(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '7') {
      // Clean the parent text
      const cleanText = 'Do ONE of the following options:'

      return {
        ...req,
        text: cleanText,
        requiredCount: 1,
        subrequirements: req.subrequirements?.map(sub => ({
          ...sub,
          isAlternative: sub.text.startsWith('Option'),
          alternativesGroup: 'Snow Sports-req-7',
        })),
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Cycling merit badge - complex restructuring needed
function fixCycling(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '6') {
      // Completely restructure requirement 6
      // Based on BSA requirements, there are two options with their own sub-requirements

      const optionA: Subrequirement = {
        id: '6A',
        text: 'Option A—Road Biking. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Cycling-req-6',
        subrequirements: [
          {
            id: '6A1',
            text: 'Take a road safety test with your counselor and demonstrate the following:',
            subrequirements: [
              { id: '6A1a', text: 'On an urban street with light traffic, properly execute a left turn from the center of the street; also demonstrate an alternate left-turn technique used during periods of heavy traffic.' },
              { id: '6A1b', text: 'Properly execute a right turn.' },
              { id: '6A1c', text: 'Demonstrate appropriate actions at a right-turn-only lane when you are continuing straight.' },
              { id: '6A1d', text: 'Show proper curbside and road-edge riding. Show how to ride safely along a row of parked cars.' },
              { id: '6A1e', text: 'Cross railroad tracks properly.' },
            ],
          },
          { id: '6A2', text: 'Avoiding main highways, take two rides of 10 miles each, two rides of 15 miles each, and two rides of 25 miles each. You must make a report of the rides taken. List dates for the routes traveled, and interesting things seen on the ride.' },
          { id: '6A3', text: 'Lay out on a road map a 50-mile trip. Stay away from main highways. Using your map, make this ride in eight hours or less.' },
          { id: '6A4', text: 'Participate in an organized bike tour of at least 50 miles. Make this ride in eight hours or less. Afterward, use the tour\'s cue sheet to make a map of the ride.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '6B',
        text: 'Option B—Trail or Mixed Surface Biking. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Cycling-req-6',
        subrequirements: [
          {
            id: '6B1',
            text: 'Demonstrate the following mountain bike handling skills to your counselor:',
            subrequirements: [
              { id: '6B1a', text: 'Neutral position, ready position, bike body separation (side to side, and forward and back), and body positioning for cornering' },
              { id: '6B1b', text: 'Show shifting skills as applicable to climbs and obstacles.' },
              { id: '6B1c', text: 'Show proper technique for riding up and down hills, including when you would ride seated, crouched, or standing.' },
            ],
          },
          {
            id: '6B2',
            text: 'Demonstrate the following trail skills to your counselor:',
            subrequirements: [
              { id: '6B2a', text: 'Show proper trail etiquette to hikers and other cyclists, including when to yield the right-of-way.' },
              { id: '6B2b', text: 'Demonstrate how to correctly cross an obstacle by either going over the obstacle on your bike or dismounting your bike and crossing over or around the obstacle.' },
              { id: '6B2c', text: 'Cross rocks, gravel, and roots properly.' },
            ],
          },
          { id: '6B3', text: 'Take two rides of 2 miles each, two rides of 5 miles each, and two rides of 8 miles each. You must make a report of the rides taken. List dates for the routes traveled, and interesting things seen.' },
          { id: '6B4', text: 'After fulfilling the previous requirement, lay out on a trail map a 22-mile trip. You may include multiple trail systems, if needed. Stay away from main highways. Using your map, complete this ride in one day.' },
        ],
      }

      return {
        id: '6',
        text: 'Using the Scouting America buddy system, complete all of the requirements for ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Animal Science merit badge
function fixAnimalScience(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '6') {
      const optionA: Subrequirement = {
        id: '6A',
        text: 'Option A—Beef Cattle. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Animal Science-req-6',
        subrequirements: [
          { id: '6A1', text: 'Visit a farm or ranch where beef cattle are produced under any of these systems: (a) feeding market cattle for harvest, (b) move-calf production, or (c) purebred production.' },
          { id: '6A2', text: 'Describe what you learned about breeding, feeding, and marketing of beef cattle on this visit.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '6B',
        text: 'Option B—Dairying. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Animal Science-req-6',
        subrequirements: [
          { id: '6B1', text: 'Visit a dairy farm.' },
          { id: '6B2', text: 'Describe what you learned about breeding, feeding, and marketing dairy cattle at this visit.' },
        ],
      }

      const optionC: Subrequirement = {
        id: '6C',
        text: 'Option C—Horse Production. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Animal Science-req-6',
        subrequirements: [
          { id: '6C1', text: 'Visit a horse farm.' },
          { id: '6C2', text: 'Describe what you learned about breeding, feeding, and marketing horses at this visit.' },
        ],
      }

      return {
        id: '6',
        text: 'Complete ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB, optionC],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Archery merit badge - Requirement 5 has two options (recurve/longbow vs compound bow)
function fixArchery(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '5') {
      const optionA: Subrequirement = {
        id: '5A',
        text: 'Option A—Recurve Bow or Longbow. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Archery-req-5',
        subrequirements: [
          {
            id: '5A1',
            text: 'Using a recurve bow or longbow and arrows with a finger release, shoot a single round from one of the following at a distance of 15 yards or 10 meters, and make the qualifying score:',
            subrequirements: [
              { id: '5A1a', text: 'An NFAA field round of 14 targets and make a score of 60 points' },
              { id: '5A1b', text: 'A Scouting America field round of 14 targets and make a score of 80 points' },
              { id: '5A1c', text: 'A World Archery/USA Archery indoor round and make a score of 80 points' },
              { id: '5A1d', text: 'An NFAA indoor round and make a score of 50 points' },
            ],
          },
          { id: '5A2', text: 'Shooting 30 arrows in five-arrow ends at an 80-centimeter (32-inch) five-color target at 10 yards or 9 meters, and make a score of 150 points.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '5B',
        text: 'Option B—Compound Bow. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Archery-req-5',
        subrequirements: [
          {
            id: '5B1',
            text: 'Name and point to the parts of the compound bow you are shooting.',
          },
          { id: '5B2', text: 'Explain how to properly care for and store compound bows.' },
          { id: '5B3', text: "Demonstrate and explain USA Archery's 11 Steps of Shooting for shooting a compound bow." },
          { id: '5B4', text: 'Explain why it is necessary to have the string or cable on a compound bow replaced at an archery shop.' },
          { id: '5B5', text: 'Locate and mark with dental floss, crimp-on, or other method, the nocking point on the bowstring of the bow you are using.' },
          {
            id: '5B6',
            text: 'Do ONE of the following:',
            subrequirements: [
              {
                id: '5B6a',
                text: 'Using a compound bow and arrows with a finger release, shoot a single round from one of the following and make the qualifying score:',
                subrequirements: [
                  { id: '5B6a1', text: 'An NFAA field round of 14 targets and make a score of 70 points' },
                  { id: '5B6a2', text: 'A Scouting America field round of 14 targets and make a score of 90 points' },
                  { id: '5B6a3', text: 'A World Archery/USA Archery indoor round and make a score of 90 points' },
                  { id: '5B6a4', text: 'An NFAA indoor round and make a score of 60 points' },
                ],
              },
              { id: '5B6b', text: 'Shooting at an 80-centimeter (32-inch) five-color target using the 10 scoring zones, make a minimum score of 160 points. Shoot 30 arrows in five-arrow ends, at a distance of 10 yards or 9 meters.' },
            ],
          },
        ],
      }

      return {
        id: '5',
        text: 'Working under the supervision of a certified USA Archery Level 1 Instructor or a BSA trained archery instructor, complete ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Golf merit badge - Requirement 2 has two options (Traditional Golf vs Disc Golf)
function fixGolf(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '2') {
      const optionA: Subrequirement = {
        id: '2A',
        text: 'Option A—Traditional Golf. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Golf-req-2',
        subrequirements: [
          { id: '2A1', text: 'Tell about the three categories of golf etiquette.' },
          { id: '2A2', text: 'Demonstrate that you understand the definitions of golf terms.' },
          { id: '2A3', text: 'Show that you understand the Rules of Amateur Status. Tell about your understanding of the World Handicap System.' },
          {
            id: '2A4',
            text: 'Do the following:',
            subrequirements: [
              { id: '2A4a', text: 'Tell about the early history of golf.' },
              { id: '2A4b', text: "Describe golf's early years in the United States." },
              { id: '2A4c', text: 'Tell about the accomplishments of a top golfer of your choice.' },
            ],
          },
          {
            id: '2A5',
            text: 'Do the following:',
            subrequirements: [
              { id: '2A5a', text: 'Tell how golf can contribute to a healthy lifestyle, mentally and physically.' },
              { id: '2A5b', text: 'Tell how a golf exercise plan can help you play better. Show two exercises that could help improve your game.' },
            ],
          },
          {
            id: '2A6',
            text: 'Show the following:',
            subrequirements: [
              { id: '2A6a', text: 'The proper grip, stance, posture, and key fundamentals of a good swing' },
              { id: '2A6b', text: 'Driver played from a tee' },
              { id: '2A6c', text: 'The fairway wood shot' },
              { id: '2A6d', text: 'The long iron shot' },
              { id: '2A6e', text: 'The short iron shot' },
              { id: '2A6f', text: 'The approach, chip-and-run, and pitch shots' },
              { id: '2A6g', text: 'A recovery shot from a bunker or heavy rough' },
              { id: '2A6h', text: 'A sound putting stroke' },
            ],
          },
          {
            id: '2A7',
            text: 'Play a minimum of two nine-hole rounds or one 18-hole round of golf with another golfer about your age and with your counselor, parent, or another adult. Do the following:',
            subrequirements: [
              { id: '2A7a', text: 'Follow the Rules of Golf.' },
              { id: '2A7b', text: 'Practice good golf etiquette.' },
              { id: '2A7c', text: 'Show respect to fellow golfers, committee, sponsor, and gallery.' },
            ],
          },
          { id: '2A8', text: 'Find out about three careers related to traditional golf. Pick one career and find out about the education, training, and experience required for this profession. Discuss this with your counselor and explain why this profession might interest you.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '2B',
        text: 'Option B—Disc Golf. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Golf-req-2',
        subrequirements: [
          { id: '2B1', text: 'Study the PDGA Official Rules of Disc Golf now in use. Tell about the six areas of Courtesy (812). Describe the seven areas of Scoring (808).' },
          { id: '2B2', text: "Tell about your understanding of the PDGA Disc Golfer's Code." },
          {
            id: '2B3',
            text: 'Do the following:',
            subrequirements: [
              { id: '2B3a', text: 'Tell about the history of disc golf and why it is an inclusive game.' },
              { id: '2B3b', text: 'Discuss with your counselor the contributions Ed Headrick made to the sport of disc golf.' },
              { id: '2B3c', text: 'Describe the evolution of disc design.' },
              { id: '2B3d', text: 'Tell about the accomplishments of a top disc golfer of your choice.' },
            ],
          },
          {
            id: '2B4',
            text: 'Do the following:',
            subrequirements: [
              { id: '2B4a', text: 'Tell how disc golf can contribute to a healthy lifestyle, mentally and physically.' },
              { id: '2B4b', text: 'Tell how a disc golf exercise plan can help you play better. Show two exercises that could help improve your game.' },
            ],
          },
          {
            id: '2B5',
            text: 'Show the following:',
            subrequirements: [
              { id: '2B5a', text: 'A good throwing grip' },
              { id: '2B5b', text: 'A good runup (X-step) when throwing a disc' },
              { id: '2B5c', text: 'Backhand shot' },
              { id: '2B5d', text: 'Forehand shot' },
              { id: '2B5e', text: 'Overhand shot' },
              { id: '2B5f', text: 'Rolling shot' },
              { id: '2B5g', text: 'A good (in-line) putting stance' },
              { id: '2B5h', text: 'A good straddle putting stance' },
              { id: '2B5i', text: 'A good putting grip' },
              { id: '2B5j', text: 'A good putting motion & follow through' },
              { id: '2B5k', text: 'The proper use of a mini-marking disc' },
            ],
          },
          {
            id: '2B6',
            text: 'Play a minimum of 18-holes of disc golf with another disc golfer about your age and with your counselor, parent, or another adult. Do the following:',
            subrequirements: [
              { id: '2B6a', text: 'Follow the PDGA Official Rules of Disc Golf.' },
              { id: '2B6b', text: 'Practice good disc golf etiquette.' },
              { id: '2B6c', text: 'Show respect to fellow disc golfers and other people in the park along with the course and its signage.' },
            ],
          },
          { id: '2B7', text: 'Find out about three careers related to disc golf. Pick one career and find out about the education, training, and experience required for this profession. Discuss this with your counselor and explain why this profession might interest you.' },
        ],
      }

      return {
        id: '2',
        text: 'Complete ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Geology merit badge - Requirement 4 has four options (Surface/Sedimentary, Rocks/Minerals, Earth History, Field Trip)
function fixGeology(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '4') {
      const optionA: Subrequirement = {
        id: '4A',
        text: 'Option A—Surface and Sedimentary Processes. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Geology-req-4',
        subrequirements: [
          { id: '4A1', text: 'Make a display or presentation showing how oil and gas or coal is found, extracted, and processed. Include at least three geological terms you learned that relate to the topic and define them.' },
          {
            id: '4A2',
            text: "With your parent or guardian's and counselor's permission and assistance, visit one or more of the following: an oil or gas well, a move mine or quarry, an active coal,ite,ite, borite,ite, ite, or gravel pit or dredge. Tell your counselor what you learned about how things are found, extracted, and processed at this operation.",
          },
        ],
      }

      const optionB: Subrequirement = {
        id: '4B',
        text: 'Option B—Rocks and Minerals. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Geology-req-4',
        subrequirements: [
          { id: '4B1', text: 'Define rock. Discuss the three classes of rocks includingite, sedimentary, and morphic rocks, their origin, and how they relate to the rock cycle.' },
          { id: '4B2', text: 'Define mineral. Discuss the origin of minerals and their chemical composition and identification properties, including hardness, specific gravity, color, streak, cleavage, luster, and crystal form.' },
          {
            id: '4B3',
            text: 'Do ONE of the following:',
            subrequirements: [
              { id: '4B3a', text: 'Collect 10 different rocks or minerals. Record in a notebook where you obtained (found, bought, traded) each one. Label each specimen, identify its class and origin, and show your collection to your counselor.' },
              { id: '4B3b', text: "With your counselor's assistance, identify 15 different rocks and minerals." },
            ],
          },
          { id: '4B4', text: 'List three of the most common road building materials used in your area. Explain how geology can affect the suitability of some rocks to be used as building materials.' },
          {
            id: '4B5',
            text: 'Do ONE of the following:',
            subrequirements: [
              { id: '4B5a', text: "With your parent or guardian's and counselor's approval, visit an active mine or quarry. Tell your counselor what you learned about the mining operation and processing." },
              { id: '4B5b', text: 'With your counselor, choose two examples of rocks and two examples of minerals. Discuss the geological features or processes that created those samples.' },
              { id: '4B5c', text: "With your parent or guardian's and counselor's approval, visit the office of a civil or geotechnical engineer. Tell your counselor about the role geology plays in this profession." },
            ],
          },
        ],
      }

      const optionC: Subrequirement = {
        id: '4C',
        text: 'Option C—Earth History. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Geology-req-4',
        subrequirements: [
          { id: '4C1', text: 'Create a chart showing suggested geological eras and periods. Determine which period is considered the beginning of life on our planet.' },
          { id: '4C2', text: 'Explain the theory of plate tectonics. Make a chart explaining the differences among continental drift, isostasy, volcanism, and seafloor spreading.' },
          { id: '4C3', text: 'Explain to your counselor the processes of burial and fossilization, and discuss the resulting fossils: plant fossils, &  fossils, molds, casts, and trace fossils.' },
          { id: '4C4', text: 'Explain to your counselor how fossils provide information about ancient life, environment, climate, and geography. Discuss the following terms and explain how animals from each survive today: prehistoric and Mesozoic.' },
          { id: '4C5', text: "Collect 10 different fossil plants or animals OR (with your counselor's assistance) make a display of 10 different fossil plants or animals, and identify each. You may use your own collection, the collection of another Scout, your school or council camp collection, or one belonging to a museum, nature center, or hobby shop." },
          {
            id: '4C6',
            text: 'Do ONE of the following:',
            subrequirements: [
              { id: '4C6a', text: 'Visit a science museum or the geology department of a local university. Tell your counselor what you learned and saw.' },
              { id: '4C6b', text: 'Visit a structure in your area that was built using fossiliferous rock. Determine what kind of rock was used and tell your counselor about the structure.' },
              { id: '4C6c', text: 'Visit a rock outcrop that contains fossils. Determine what kind of rock it is and tell your counselor about the outcrop and the fossils it contains.' },
              { id: '4C6d', text: 'Prepare a display or presentation on your state fossil. Include an image of the fossil, the age of the fossil, the geological formation where it is found, and how important this fossil is to the history of your state.' },
            ],
          },
        ],
      }

      return {
        id: '4',
        text: 'Do ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB, optionC],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Metalwork merit badge - Requirement 5 has four options (A-General, B-Silversmith, C-Founder, D-Blacksmith)
function fixMetalwork(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '5') {
      const optionA: Subrequirement = {
        id: '5A',
        text: 'Option A—General Metalwork. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Metalwork-req-5',
        subrequirements: [
          { id: '5A1', text: 'Make and submit working sketches for two useful articles or items of metalwork. They must not be the same kind, and one must be made of sheet metal. Include dimensions for each sketch.' },
          { id: '5A2', text: 'Make two useful articles, one from sheet metal. One object must include at least one riveted component.' },
          { id: '5A3', text: 'If you do not make your objects from zinc-plated sheet steel or tin-plated sheet steel, clean and polish your work, removing all file and emery marks, and apply a finish to prevent corrosion.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '5B',
        text: 'Option B—Silversmith. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Metalwork-req-5',
        subrequirements: [
          { id: '5B1', text: "Name and describe the use of a silversmith's basic tools." },
          { id: '5B2', text: 'Create a sketch of two objects to make from sheet silver. Include each object dimensions.' },
          { id: '5B3', text: 'Make two objects out of 18- or 20-gauge sheet copper. Use planning, annealing, and sinking or other forming processes, as well as filing, emery, and polishing. At least one object must include a sawed component you have made yourself. At least one object must include a sunken part you have made yourself.' },
          { id: '5B4', text: 'Clean and polish your objects.' },
        ],
      }

      const optionC: Subrequirement = {
        id: '5C',
        text: 'Option C—Founder. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Metalwork-req-5',
        subrequirements: [
          { id: '5C1', text: 'Name and describe the use of the basic parts of a two-piece mold. Name at least three metals that can be used as a casting.' },
          { id: '5C2', text: "Create a sketch of two objects to cast in metal. Include each object's complete dimensions." },
          { id: '5C3', text: 'Make two molds, one using a pattern provided by your counselor and one using a pattern that you create. Make a casting from each.' },
          { id: '5C4', text: 'Using lead-free pewter, make a casting using a mold provided by your counselor.' },
          { id: '5C5', text: 'Using lead-free pewter, make a casting using the mold that you have made.' },
        ],
      }

      const optionD: Subrequirement = {
        id: '5D',
        text: 'Option D—Blacksmith. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Metalwork-req-5',
        subrequirements: [
          { id: '5D1', text: "Name and describe the use of a blacksmith's basic tools." },
          { id: '5D2', text: 'Make a sketch of two objects to hot-forge. Include each component dimension.' },
          {
            id: '5D3',
            text: 'Using low-carbon steel at least 1/4 inch thick, perform the following:',
            subrequirements: [
              { id: '5D3a', text: 'Draw out by forging a taper.' },
              { id: '5D3b', text: 'Use the horn of the anvil by forging a U-shaped bend.' },
              { id: '5D3c', text: 'Form a decorative twist in a piece of square steel.' },
              { id: '5D3d', text: 'Use the edge of the anvil to bend metal by forging an L-shaped bend.' },
            ],
          },
          {
            id: '5D4',
            text: 'Using low-carbon steel at least 1/4 inch thick, make the two objects according to your sketches. Be sure to do the following:',
            subrequirements: [
              { id: '5D4a', text: 'Include a decorative twist on one object.' },
              { id: '5D4b', text: 'Include a hammer-riveted joint in one object.' },
              { id: '5D4c', text: 'Preserve your work from oxidation.' },
            ],
          },
        ],
      }

      return {
        id: '5',
        text: 'After completing the first four requirements, complete ONE of the following options:',
        requiredCount: 1,
        subrequirements: [optionA, optionB, optionC, optionD],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Fix Plant Science merit badge - Requirement 8 has four options (Agronomy, Horticulture, Field Botany, Forestry)
function fixPlantScience(badge: MeritBadge): MeritBadge {
  const requirements = badge.requirements.map(req => {
    if (req.id === '8') {
      const optionA: Subrequirement = {
        id: '8A',
        text: 'Option A—Agronomy. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Plant Science-req-8',
        subrequirements: [
          { id: '8A1', text: 'Explain the difference between vegetative and sexual propagation methods, and tell some advantages of each. Give examples of different plant species that are typically propagated using each method.' },
          { id: '8A2', text: 'Transplant 12 seedlings or rooted cuttings to larger containers and grow them for at least one month.' },
          { id: '8A3', text: 'Demonstrate good pruning techniques and tell why pruning is important.' },
          { id: '8A4', text: 'After obtaining permission, plant a tree or shrub properly in an appropriate site.' },
        ],
      }

      const optionB: Subrequirement = {
        id: '8B',
        text: 'Option B—Horticulture. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Plant Science-req-8',
        subrequirements: [
          { id: '8B1', text: 'Explain the importance of good landscape design and selection of plants that are right for particular locations and situations.' },
          { id: '8B2', text: 'Tell why it is important to know how big a plant will grow.' },
          { id: '8B3', text: 'Tell why slower-growing landscape plants are sometimes a better choice than faster-growing varieties.' },
          {
            id: '8B4',
            text: 'Do ALL of the requirements in ONE of the following alternatives:',
            subrequirements: [
              {
                id: '8B4-Alt1',
                text: 'Alternative 1: Bedding Plants',
                subrequirements: [
                  { id: '8B4-1a', text: 'Grow bedding plants appropriate for your area in pots or flats from seed or cuttings in a controlled environment.' },
                  { id: '8B4-1b', text: 'Transplant plants to a bed in the landscape and maintain the bed until the end of the growing season.' },
                  { id: '8B4-1c', text: 'Demonstrate mulching, fertilizing, watering, weeding, and deadheading, and tell how each practice contributes to the health of your bed.' },
                ],
              },
              {
                id: '8B4-Alt2',
                text: 'Alternative 2: Move Gardens',
                subrequirements: [
                  { id: '8B4-2a', text: 'Prepare a scale-drawing landscape plan for a bed in your yard, a move, or at a public building. Use plants appropriate for your area.' },
                  { id: '8B4-2b', text: 'Obtain plans for a house lot and draw a plan showing site conditions, natural features, improvements, existing vegetation, and your proposed planting.' },
                ],
              },
            ],
          },
        ],
      }

      const optionC: Subrequirement = {
        id: '8C',
        text: 'Option C—Field Botany. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Plant Science-req-8',
        subrequirements: [
          { id: '8C1', text: 'Visit a natural area near your move, such as a forest, grassland, or wetland. Record the types of plants you find there and tell how the plants interact with each other and with the environment.' },
          { id: '8C2', text: 'Identify at least 20 species of plants in the field.' },
          { id: '8C3', text: 'Collect and preserve 10 different plant specimens and identify them.' },
          { id: '8C4', text: 'Make a display or presentation showing at least 10 weed plants.' },
        ],
      }

      const optionD: Subrequirement = {
        id: '8D',
        text: 'Option D—Forestry. Do ALL of the following:',
        isAlternative: true,
        alternativesGroup: 'Plant Science-req-8',
        subrequirements: [
          { id: '8D1', text: 'Describe the following forestry concepts: multiple-use land management, watershed management, sustainable forestry, even-aged and uneven-aged forest management, timber stand improvement, prescribed burn, salvage cut, and seed-tree and shelterwood harvesting.' },
          { id: '8D2', text: 'Visit a forest managed for timber. Identify the trees being grown for wood products, describe how the trees are harvested, and describe the plans for regenerating the forest after harvest.' },
          { id: '8D3', text: 'Plant and care for 25 seedlings of a native tree species.' },
        ],
      }

      return {
        id: '8',
        text: 'Choose ONE of the following options and complete each requirement:',
        requiredCount: 1,
        subrequirements: [optionA, optionB, optionC, optionD],
      }
    }
    return req
  })

  return { ...badge, requirements }
}

// Main transformation
async function main() {
  const inputPath = path.join(process.cwd(), 'data/merit-badges-source-v2.json')
  const outputPath = path.join(process.cwd(), 'data/merit-badges-source-v2.json')

  console.log('Reading transformed file...')
  const sourceData: SourceData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))

  console.log('Applying manual fixes...\n')

  const fixes = [
    { name: 'Radio', fix: fixRadio },
    { name: 'Skating', fix: fixSkating },
    { name: 'Snow Sports', fix: fixSnowSports },
    { name: 'Cycling', fix: fixCycling },
    { name: 'Animal Science', fix: fixAnimalScience },
    { name: 'Archery', fix: fixArchery },
    { name: 'Golf', fix: fixGolf },
    { name: 'Geology', fix: fixGeology },
    { name: 'Metalwork', fix: fixMetalwork },
    { name: 'Plant Science', fix: fixPlantScience },
  ]

  let fixedCount = 0

  sourceData.merit_badges = sourceData.merit_badges.map(badge => {
    const fixConfig = fixes.find(f => f.name === badge.name)
    if (fixConfig) {
      console.log(`  ✓ Fixed: ${badge.name}`)
      fixedCount++
      return fixConfig.fix(badge)
    }
    return badge
  })

  // Write fixed data
  fs.writeFileSync(outputPath, JSON.stringify(sourceData, null, 2))

  console.log(`\n✓ Applied ${fixedCount} manual fixes`)
  console.log(`✓ Wrote to ${outputPath}`)

  console.log(`\n✅ All badges with Option A/B patterns have been fixed!`)
}

main().catch(console.error)
