import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faTwitter,
  faFacebook,
  faXTwitter,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import { faDoorOpen, faPen } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "flowbite-react";
import { Octokit } from "@octokit/core";
import { useTranslation } from "react-i18next";

const JoinUsBtn = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isInvitationSent, setIsInvitationSent] = useState(false);

  const handleJoinOrganization = async () => {
    try {
      const octokit = new Octokit({
        auth: import.meta.env.VITE_GITHUB_COLLABORATORS_TOKEN,
      });

      await octokit.request("POST /orgs/{org}/invitations", {
        org: "new-algeria",
        email: email,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      setIsInvitationSent(true);

      //alert(t("joinUs.invitationSuccess"));
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert(t("joinUs.invitationFailure"));
      setIsInvitationSent(false);
    }
  };

  return (
    <div>
      <button
        className="bg-black text-primary-foreground hover:bg-primary/90 dark:bg-accent dark:hover:bg-accent/90 py-2 px-4 rounded-lg dark:text-black"
        onClick={() => setIsModalOpen(true)}
      >
        <span className="hidden sm:inline">✨ {t("joinUs.joinUs")}</span>
        <span className="sm:hidden">✨</span>
      </button>

      {isModalOpen && (
        <Modal
          dismissible
          show={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <Modal.Header>{t("joinUs.joinUs")}</Modal.Header>
          <Modal.Body>
            <p className="text-sm -mt-3 text-gray-600 dark:text-gray-400">
              {t("joinUs.motivations")} <br />
              <br />
              🤝 {t("joinUs.motivations2")}{" "}
            </p>
            <hr className="my-4 dark:border-gray-200 border-gray-700 w-1/3 mx-auto" />
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  1.
                  <FontAwesomeIcon icon={faGithub} className="ml-2 mr-1" />
                  {t("joinUs.joinGithub")}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder={t("joinUs.emailPlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoinOrganization();
                    }}
                  />
                  <button
                    id="joinButton"
                    onClick={handleJoinOrganization}
                    disabled={!email}
                    className="bg-green-500 text-white hover:bg-green-600 py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {t("joinUs.join")}
                  </button>
                </div>
                {/* check ur emails */}
                {isInvitationSent && (
                  <p className="text-green-500">{t("joinUs.invitationSent")}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium ">
                  2. {t("joinUs.writeUs")}
                </h3>
                <a
                  href={`mailto:admin@newalgeria.org?subject=${t(
                    "joinUs.emailSubject"
                  )}&body=${t("joinUs.emailBody")}`}
                >
                  <button
                    onClick={() => alert(t("joinUs.writeAlert"))}
                    className="bg-purple-500 text-white hover:bg-purple-600 py-2 px-4 rounded-lg flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faPen} className="mr-2" />{" "}
                    {t("joinUs.writeToUs")}
                  </button>
                </a>
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  3. {t("joinUs.connectWithUs")}
                </h3>
                <div className="flex space-x-4 p-2">
                  {/*  <a
                    href="https://github.com/new-algeria"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faGithub} size="2x" />
                  </a> */}
                  <a
                    href="https://x.com/newalgeria_org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faXTwitter} size="2x" />
                  </a>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon
                      icon={faLinkedin}
                      size="2x"
                      className="text-blue-700"
                    />
                  </a>
                </div>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default JoinUsBtn;
