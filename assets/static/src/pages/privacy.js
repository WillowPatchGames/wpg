import React from 'react';

import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import '../App.css';
import '../main.scss';

class PrivacyPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <section className="text">
              <Typography use="headline2">
                Willow Patch Games Privacy Policy
              </Typography>
              <p class="text-left">
                <i>Last updated on: October 31, 2020</i>
              </p>
              <p class="text-left">
                <i>Willow Patch Games (WPG)</i> is an on-line, family-centric
                  game experience that is solely funded out of your licenses.
                  We do not sell nor display advertisements. We do not sell
                  your personal information. Thus, any personal information
                  collected is based solely on presenting the best experience
                  to the members of the community.
              </p>
              <Typography use="headline6">
                What information does WPG collect?
              </Typography>
              <p class="text-left">
                Like most communities, WPG provides the ability to create an
                account. In this process, you may provide personal information
                such as a valid email address or online username. Additionally,
                you may optionally provide other information such as your name.
                This information will only be shared with those people with
                whom you play games and will not be shared publicly.
              </p>
              <p class="text-left">
                We utilize the third-party Gravatar service for hosting profile
                pictures. We use users' email addresses to link to their profile
                on Gravatar, if one exists. Any use of Gravatar on your own
                account is optional; to avoid, simply don't provide an email
                address. For more information on Gravar's privacy policy,
                see <a href="https://automattic.com/privacy">https://automattic.com/privacy</a>.
              </p>
              <p class="text-left">
                When providing payment information, WPG uses a third party
                payment processor, Stripe, to process the payment. WPG retains
                no personal information from the transaction and does not store
                or have access to your credit card information. The payment
                processor, however, will retain some information. For more
                information on Stripe's privacy policy,
                see <a href="https://stripe.com/privacy">https://stripe.com/privacy</a>.
              </p>
              <p class="text-left">
                In addition to personal information, WPG may collect
                administrative information such as IP address, usage
                statistics, context information such as browser and client, and
                game play information and statistics. This information is used
                to improve the service for yourself and others.
              </p>
              <Typography use="headline6">
                What information does WPG not collect?
              </Typography>
              <p class="text-left">
                WPG does not collect nor require you to provide your real name;
                any identifiers you share with us are at your own discretion.
                We do not collect phone numbers, physical addresses, gender,
                sex, race, ethnicity, nationality, religious or other beliefs,
                or marital status.
              </p>
              <Typography use="headline6">
                How does WPG use your information?
              </Typography>
              <p class="text-left">
                We use information you share with us to communicate about
                upcoming changes to our service, and various transactional
                communications, including but not limited to: password reset,
                account confirmation, and any support requests you make.
              </p>
              <Typography use="headline6">
                How does WPG share your information?
              </Typography>
              <p class="text-left">
                WPG will not share your identifying information outside of our
                organization.
              </p>
              <Typography use="headline6">
                How does WPG use cookies and tracking?
              </Typography>
              <p class="text-left">
                WPG does not use cookies and does not track individual
                movements around our site. Third parties we use to provide our
                service, such as Stripe and Gravatar may use cookies and other
                tracking techniques. For more information, see their privacy
                policies above.
              </p>
              <Typography use="headline6">
                How does WPG secure your information?
              </Typography>
              <p class="text-left">
                We limit access to sensitive information (such as email
                  address) to only yourself and WPG. Only your display name
                  will be shared with other users.
              </p>
              <p class="text-left">
                We allow only selected administrators to access the production
                  servers. This limits the spread of data within our organization.
              </p>
              <p class="text-left">
                We use industry standard practices to store and secure any password you
                  create. We strongly recommend you create a unique and
                  memorable password for use with your account here.
              </p>
              <p class="text-left">
                In the event of a data breach, we will make every attempt to
                notify customers of the scope and date of incidence, via our
                website and directly via email when provided to us.
              </p>
              <Typography use="headline6">
                How does WPG inform users of changes in the Privacy Policy?
              </Typography>
              <p class="text-left">
                We will notify existing users of our site via an on-site
                notification, as well as sending emails to users who have
                provided theirs.
              </p>
              <Typography use="headline6">
                How can I contact WPG to discuss the Privacy Policy?
              </Typography>
              <p class="text-left">
                Feel free to reach out to us via email
                at <a href="mailto:willowpatchgames@gmail.com">willowpatchgames.com</a> with
                any questions or concerns.
              </p>
            </section>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { PrivacyPage };
