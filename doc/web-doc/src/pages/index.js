import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import styled from 'styled-components'

import Layout from "../components/layout"
import Seo from "../components/seo"
import * as styles from "../components/index.module.css"

const links = [
  {
    text: "Trace Server Protocol",
    url: "https://eclipse-cdt-cloud.github.io/trace-server-protocol/",
    description:
      "Specification of the Trace Server Protocol, used by the Theia Trace Extension.",
  },
  {
    text: "Tutorials",
    url: "https://github.com/tuxology/tracevizlab",
    description:
      "A series of labs and guides for collecting traces from the operating system or userspace applications or cloud environments, and visualizing them with trace visualization tools.",
  },
]

const samplePageLinks = [
  {
    text: "Getting Started",
    url: "getting-started",
    badge: false,
    description:
      "A simple example of linking to another page within a Gatsby site",
  },
  { text: "About", url: "about" },
]

const moreLinks = [
  { text: "Join us on Discord", url: "https://gatsby.dev/discord" },
  {
    text: "Documentation",
    url: "https://gatsbyjs.com/docs/",
  },
  {
    text: "Starters",
    url: "https://gatsbyjs.com/starters/",
  },
  {
    text: "Showcase",
    url: "https://gatsbyjs.com/showcase/",
  },
  {
    text: "Contributing",
    url: "https://www.gatsbyjs.com/contributing/",
  },
  { text: "Issues", url: "https://github.com/gatsbyjs/gatsby/issues" },
]

const utmParameters = `?utm_source=starter&utm_medium=start-page&utm_campaign=default-starter`

const CardContainer = styled.div`
  display: flex;
  margin: 32px 0;
  justify-content: space-around;
`

const Card = styled(Link)`
  display: inline-block;
  border-radius: 4px;
  padding: 20px 40px;
  width: 250px;
  background-color: #aaa;
  color: #fff !important;
  text-align: center;
`

const IndexPage = () => (
  <Layout>
    <Seo title="Home" />
    <div className={styles.textCenter}>
      <StaticImage
        src="../images/theia-trace-extension-0.0.3.png"
        loading="eager"
        width={1024}
        quality={95}
        formats={["auto", "webp", "avif"]}
        alt=""
        style={{ marginBottom: `var(--space-3)` }}
      />
      <h1>
        Documentation for <b>Theia Trace Extension</b>
      </h1>
      <p className={styles.intro}>
        <b>Example pages:</b>{" "}
        {samplePageLinks.map((link, i) => (
          <React.Fragment key={link.url}>
            <Link to={link.url}>{link.text}</Link>
            {i !== samplePageLinks.length - 1 && <> · </>}
          </React.Fragment>
        ))}
        <br />
      </p>
    </div>
    <CardContainer>
      {links.map(link => (
        <Card to={link.url}>
          {link.text}
        </Card>
      ))}
    </CardContainer>
    <ul className={styles.list}>
      {links.map(link => (
        <li key={link.url} className={styles.listItem}>
          <a
            className={styles.listItemLink}
            href={`${link.url}${utmParameters}`}
          >
            {link.text} ↗
          </a>
          <p className={styles.listItemDescription}>{link.description}</p>
        </li>
      ))}
    </ul>
    {moreLinks.map((link, i) => (
      <React.Fragment key={link.url}>
        <a href={`${link.url}${utmParameters}`}>{link.text}</a>
        {i !== moreLinks.length - 1 && <> · </>}
      </React.Fragment>
    ))}
  </Layout>
)

export default IndexPage
