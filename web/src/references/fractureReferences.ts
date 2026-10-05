export type XrayCrop = 'left' | 'right'

export type XrayReferenceImage = {
  src: string
  crop: XrayCrop
  alt: string
}

export type FractureReference = {
  ap?: XrayReferenceImage
  lateral?: XrayReferenceImage
  source?: {
    label: string
    url: string
    licence: string
    note?: string
  }
}

const CARUSO_FIGURE_1 =
  'https://media.springernature.com/full/springer-static/image/art%3A10.1186%2Fs13018-019-1530-1/MediaObjects/13018_2019_1530_Fig1_HTML.png'

export const fractureReferences = {
  normal: {},
  colles: {
    ap: {
      src: CARUSO_FIGURE_1,
      crop: 'left',
      alt: 'Postero-anterior radiograph of an extra-articular distal radius fracture with dorsal displacement',
    },
    lateral: {
      src: CARUSO_FIGURE_1,
      crop: 'right',
      alt: 'Lateral radiograph of an extra-articular distal radius fracture with dorsal displacement',
    },
    source: {
      label: 'Caruso et al., 2019',
      url: 'https://link.springer.com/article/10.1186/s13018-019-1530-1',
      licence: 'CC BY 4.0',
      note: 'Figure 1 cropped into PA and lateral teaching references.',
    },
  },
  smith: {},
} satisfies Record<'normal' | 'colles' | 'smith', FractureReference>
